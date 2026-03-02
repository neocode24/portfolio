---
title: "Kubernetes Image Volumes - OCI 이미지를 볼륨으로 마운트하기"
description: "KEP-4639 기반 Image Volumes 기능으로 OCI 이미지를 Pod에 읽기 전용 볼륨으로 직접 마운트하는 방법과 동작 원리, 활용 사례를 정리합니다."
pubDate: 2026-03-02
tags: ["kubernetes", "oci", "container", "volume", "devops"]
vaultSource: "2026.03/Kubernetes Image Volumes - OCI 이미지 볼륨.md"
---

> KEP-4639: VolumeSource - OCI Artifact and/or Image
> v1.31 Alpha → v1.33 Beta → **v1.35 Beta (기본 활성화)** → v1.36 GA 예정
> OCI 이미지를 레지스트리에서 가져와 읽기 전용 볼륨으로 Pod에 직접 마운트

## 개요

OCI 이미지 또는 아티팩트를 Kubernetes의 네이티브 볼륨 소스로 사용하는 기능이다. 기존에는 컨테이너 이미지 안에 데이터를 함께 빌드하거나, S3/GCS 같은 외부 스토리지를 사용해야 했지만, 이제 OCI 이미지를 직접 볼륨으로 마운트할 수 있다.

> **참고**: v1.35에서는 Beta (기본 활성화) 상태이며, GA(Stable)는 v1.36에서 예정이다.

## 동작 원리

```
[Pod Spec]
  volumes:
    - name: my-data
      image:
        reference: "registry.io/my-data:v1"
        pullPolicy: IfNotPresent
          │
          ▼
[Kubelet]
  │
  ├─ CRI API를 통해 컨테이너 런타임에 이미지 pull 요청
  │
  ▼
[Container Runtime (containerd / CRI-O)]
  │
  ├─ 1. OCI 이미지/아티팩트를 레지스트리에서 pull
  ├─ 2. 매니페스트의 레이어들을 단일 디렉토리로 병합
  │     (컨테이너 이미지와 동일한 방식으로 overlay)
  ├─ 3. 읽기 전용(ro) + 실행 불가(noexec)로 마운트
  │
  ▼
[Pod Container]
  │
  └─ volumeMount 경로에서 이미지 내용에 직접 접근
     (예: /data/model-weights, /data/config 등)
```

### 핵심 포인트

1. **CRI 인터페이스 확장**: Kubelet이 CRI API를 통해 런타임에 이미지 pull + 마운트를 요청
2. **레이어 병합**: OCI 이미지의 레이어들이 컨테이너 이미지와 동일한 방식으로 병합되어 단일 디렉토리로 노출
3. **읽기 전용**: 보안을 위해 항상 read-only, noexec로 마운트
4. **이미지 캐싱**: 컨테이너 이미지와 동일한 캐싱 메커니즘 활용

## Pod 정의 예제

### 기본 사용법

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-inference
spec:
  volumes:
    - name: model-weights
      image:
        reference: "registry.io/ml-models/gpt-mini:v2"
        pullPolicy: IfNotPresent
  containers:
    - name: model-server
      image: registry.io/model-server:latest
      volumeMounts:
        - name: model-weights
          mountPath: /models
```

### 웹 서버 + 정적 콘텐츠 분리

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  volumes:
    - name: web-assets
      image:
        reference: "registry.io/my-website:v3.1"
        pullPolicy: IfNotPresent
    - name: nginx-config
      image:
        reference: "registry.io/nginx-config:production"
        pullPolicy: IfNotPresent
  containers:
    - name: nginx
      image: nginx:alpine
      volumeMounts:
        - name: web-assets
          mountPath: /usr/share/nginx/html
        - name: nginx-config
          mountPath: /etc/nginx/conf.d
```

### 보안 스캐너 + 시그니처 DB

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: malware-scanner
spec:
  volumes:
    - name: signatures
      image:
        reference: "private-registry.io/malware-sigs:2026-03-01"
        pullPolicy: Always
  containers:
    - name: scanner
      image: public-registry.io/clamav:latest
      volumeMounts:
        - name: signatures
          mountPath: /var/lib/clamav
```

## Pull Policy

| 값 | 동작 | 기본 적용 |
|---|---|---|
| **Always** | 항상 pull 시도, 실패 시 Pod 생성 실패 | `:latest` 태그 사용 시 |
| **IfNotPresent** | 로컬에 없을 때만 pull | 그 외 태그 사용 시 |
| **Never** | pull 하지 않음, 로컬만 사용 | 명시적 지정 필요 |

## 제약 사항

| 항목 | 상태 |
|------|------|
| 읽기 전용 | ✅ 항상 ro + noexec |
| subPath 마운트 | ❌ 미지원 |
| fsGroupChangePolicy | ❌ 이 볼륨 타입에 적용 안 됨 |
| Pod 재생성 시 | 볼륨이 re-resolve됨 (최신 이미지 반영) |
| 런타임 요구 | containerd 또는 CRI-O (OCI 이미지 볼륨 지원 필요) |

## 기존 방식과 비교

### Before: 데이터를 컨테이너에 포함

```
[app-image:v1] = 앱 코드 + ML 모델(5GB) + 설정 파일
→ 이미지 크기 거대, 앱 업데이트마다 모델도 함께 빌드
→ 모델만 업데이트하려면 전체 이미지 재빌드 필요
```

### Before: 외부 스토리지 사용

```
[app-image:v1] = 앱 코드만
[S3/GCS] = ML 모델, 설정 파일
→ initContainer로 다운로드 or 앱 내에서 fetch
→ 추가 비용, 버킷 관리, 권한 설정 필요
→ 네트워크 의존성
```

### After: Image Volumes

```
[app-image:v1] = 앱 코드만
[model-image:v2] = ML 모델 (OCI 이미지로 패키징)
[config-image:prod] = 설정 파일 (OCI 이미지로 패키징)
→ 각각 독립적으로 버전 관리, push, pull
→ OCI 레지스트리의 캐싱/배포 인프라 그대로 활용
→ 추가 스토리지 서비스 불필요
```

## 활용 사례

### 1. AI/ML 모델 배포
- LLM 가중치를 OCI 아티팩트로 패키징
- 모델 서버와 모델 가중치를 분리
- 모델 업데이트 시 서버 이미지 재빌드 불필요
- OCI 레지스트리의 레이어 공유로 대용량 모델 효율적 배포

### 2. 웹 서버 정적 자산
- nginx/Apache 베이스 이미지 공유
- 사이트별 콘텐츠만 별도 이미지로 관리
- 중복 제거, 빠른 배포

### 3. 보안 시그니처 배포
- 공개 스캐너 이미지 + 비공개 시그니처 DB 분리
- 시그니처만 별도 업데이트 가능

### 4. 설정 파일 배포
- 환경별 설정을 OCI 이미지로 관리
- ConfigMap보다 대용량 설정 지원
- 버전 관리 + 롤백 용이

### 5. Java 앱 자동 계측
- OpenTelemetry Java Agent를 OCI 이미지로 마운트
- 앱 이미지 수정 없이 자동 계측 적용
- Agent 업데이트 시 볼륨 이미지만 태그 변경

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-springboot-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          env:
            - name: JAVA_TOOL_OPTIONS
              value: "-javaagent:/otel/opentelemetry-javaagent.jar"
          volumeMounts:
            - name: otel-agent
              mountPath: /otel
              readOnly: true
      volumes:
        - name: otel-agent
          image:
            reference: docker.io/otel/opentelemetry-javaagent:2.12.0
            pullPolicy: IfNotPresent

```
init container 없이, emptyDir 없이, 이미지 안의 jar 파일이 /otel 경로에 바로 마운트

## OCI 이미지 빌드 방법

데이터를 OCI 이미지로 패키징하는 간단한 예:

```dockerfile
# Dockerfile.model
FROM scratch
COPY ./model-weights /models
```

```bash
docker build -f Dockerfile.model -t registry.io/ml-models/gpt-mini:v2 .
docker push registry.io/ml-models/gpt-mini:v2
```

또는 ORAS (OCI Registry As Storage)를 사용:

```bash
# ORAS로 아티팩트 push
oras push registry.io/ml-models/gpt-mini:v2 \
  ./model-weights:application/octet-stream
```

## 보안 고려사항

- 신뢰할 수 없는 레지스트리의 이미지를 볼륨으로 마운트하지 않도록 정책 필요
- 실행 가능한 콘텐츠를 포함한 이미지 마운트 주의 (noexec이지만 스크립트 해석기를 통한 실행 가능)
- 이미지 서명 검증 (cosign, notation 등) 권장
- NetworkPolicy로 레지스트리 접근 제한

## 타임라인

| 버전 | 상태 | Feature Gate |
|------|------|-------------|
| v1.31 (2024) | Alpha | `ImageVolume=false` (기본 비활성) |
| v1.33 (2025) | Beta | `ImageVolume=false` (기본 비활성) |
| **v1.35 (2026)** | **Beta (기본 활성)** | **`ImageVolume=true`** |
| v1.36 (2026 예정) | GA (Stable) 목표 | Feature Gate 제거 |

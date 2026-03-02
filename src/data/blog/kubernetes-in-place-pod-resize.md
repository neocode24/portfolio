---
title: "Kubernetes In-Place Pod Resize - Pod 재시작 없이 CPU/메모리 동적 변경"
description: "KEP-1287 기반 In-Place Pod Resource Update의 동작 원리, 사용법, 제약 사항을 정리합니다. v1.35에서 GA로 승격된 핵심 기능입니다."
pubDate: 2026-03-02
tags: ["kubernetes", "pod", "resource-management", "devops"]
vaultSource: "2026.03/Kubernetes In-Place Pod Resize.md"
---

> KEP-1287: In-Place Update of Pod Resources
> v1.27 Alpha → v1.33 Beta → **v1.35 GA (Stable)**
> CPU와 메모리를 Pod 재시작 없이 동적으로 변경하는 기능

## 왜 필요한가?

기존에는 Pod의 CPU/메모리 리소스가 **불변(immutable)**이었다. 리소스를 변경하려면 Pod을 삭제하고 재생성해야 했다.

**문제점:**
- Stateful 서비스 (DB 등)는 재시작 시 다운타임 발생
- Batch Job은 진행 중인 작업이 손실
- 지연시간에 민감한 워크로드는 중단 불가
- Java 앱은 시작 시 CPU가 많이 필요하지만 정상 운영 시에는 적게 필요

## 동작 원리

### 핵심 개념

```
[사용자]
  │
  ├─ kubectl patch pod --subresource resize
  │  (spec.containers[*].resources 변경)
  │
  ▼
[API Server]
  │
  ├─ desired resources 기록
  │
  ▼
[Kubelet]
  │
  ├─ 1. Feasibility Check
  │    Node allocatable - 기존 할당량 >= 새 요청량?
  │    ├─ Yes → 진행
  │    └─ No  → PodResizePending 이벤트
  │
  ├─ 2. CRI UpdateContainerResources 호출
  │    (containerd / CRI-O에 전달)
  │
  ▼
[Container Runtime]
  │
  ├─ 3. cgroup 설정 변경 (비동기, 논블로킹)
  │    ├─ CPU: cpu.max, cpu.weight 조정
  │    └─ Memory: memory.max, memory.low 조정
  │
  └─ 4. 컨테이너 재시작 없이 즉시 적용
       (v1.33+: 런타임은 재시작하면 안 됨)
```

### 상세 흐름

1. **Mutable Resource Fields**: `spec.containers[*].resources`가 CPU/메모리에 대해 변경 가능해짐. 이 필드는 "원하는(desired) 리소스"를 나타냄
2. **Resize Subresource**: v1.33+에서 리소스 변경은 resize subresource를 통해 수행
3. **Kubelet Feasibility Check**: 노드의 가용 용량에서 기존 할당량을 빼고 새 요청이 가능한지 계산
4. **CRI Handshake**: containerd/CRI-O의 `UpdateContainerResources` API를 통해 컨테이너의 cgroup을 조정
5. **Status 반영**: `status.containerStatuses[*].resources`에 실제 적용된 리소스가 표시됨

### Resize Policy

컨테이너별로 리소스 변경 시 재시작 여부를 제어할 수 있다:

```yaml
resizePolicy:
  - resourceName: cpu
    restartPolicy: NotRequired    # CPU는 재시작 없이 변경 (기본값)
  - resourceName: memory
    restartPolicy: RestartContainer  # 메모리는 재시작 필요 시 지정
```

- `NotRequired`: 재시작 없이 리소스 변경 시도 (CPU 기본값)
- `RestartContainer`: 리소스 변경 시 컨테이너 재시작

## 사용 예제

### 기본 Pod 정의

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resize-demo
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"
    resizePolicy:
    - resourceName: cpu
      restartPolicy: NotRequired
    - resourceName: memory
      restartPolicy: NotRequired
```

### CPU/메모리 동시 변경

```bash
kubectl patch pod resize-demo --subresource resize \
  --patch '{"spec":{"containers":[{"name":"app",
    "resources":{
      "requests":{"cpu":"200m","memory":"256Mi"},
      "limits":{"cpu":"500m","memory":"512Mi"}
    }}]}}'
```

### CPU만 증가

```bash
kubectl patch pod resize-demo --subresource resize \
  --patch '{"spec":{"containers":[{"name":"app",
    "resources":{"limits":{"cpu":"800m"}}}]}}'
```

### JSON Patch 방식

```bash
kubectl patch pod resize-demo --subresource resize \
  --type='json' -p='[
    {"op":"replace","path":"/spec/containers/0/resources/limits/cpu","value":"1"},
    {"op":"replace","path":"/spec/containers/0/resources/limits/memory","value":"1Gi"}
  ]'
```

### 결과 확인

```bash
# 리소스 변경 확인
kubectl get pod resize-demo -o jsonpath='{.status.containerStatuses[0].resources}'

# 재시작 없이 적용되었는지 확인 (restartCount = 0)
kubectl get pod resize-demo -o jsonpath='{.status.containerStatuses[0].restartCount}'
```

## Resize 상태 조건 (v1.33+)

| Condition | 의미 |
|-----------|------|
| **PodResizeInProgress** | resize가 수락되어 적용 중 |
| **PodResizePending** (Deferred) | 노드에 일시적으로 여유 없음, 나중에 재시도 |
| **PodResizePending** (Infeasible) | 해당 노드에서는 불가능 |

## Kubelet 재시작 시 동작

Kubelet이 재시작되면:
1. 체크포인트 파일(`allocated_pods_state`, `actuated_pods_state`)에서 상태 복원
2. 기존 Pod은 현재 할당된 리소스 기준으로 재승인
3. 대기 중인 resize는 기존 Pod 처리 후 순서대로 진행
4. 우선순위: 오래된 요청이 먼저 처리

## v1.35 GA에서 추가된 개선사항

- **메모리 감소 허용**: 이전에는 메모리 limit 감소가 금지였으나, v1.35에서 허용. 현재 사용량이 새 limit보다 낮을 때만 적용 (OOM-kill 방지, best-effort)
- **우선순위 기반 Resize**: 노드 여유 부족 시, 오래된 요청부터 우선 처리
- **관측성 향상**: Kubelet 메트릭과 Pod 이벤트로 resize 추적 가능

## 제약 사항

1. **QoS 클래스 변경 불가**: Guaranteed → Burstable 같은 QoS 변경은 불가. requests/limits 관계가 QoS를 유지해야 함
2. **Static CPU/Memory Manager 비호환**: static CPU Manager 또는 Memory Manager가 설정된 노드에서는 resize 불가 (Infeasible)
3. **Swap 비호환**: 스왑이 활성화된 환경에서 사용 불가
4. **CPU/메모리만 가능**: GPU 등 다른 리소스는 여전히 불변
5. **런타임 요구사항**: containerd 1.6.9+ 또는 CRI-O 필요

## 실용적 활용 사례

### Java 앱 시작 최적화
```
시작 시: CPU 2000m (JVM warm-up, 클래스 로딩)
    ↓ 안정화 후 resize
정상 운영: CPU 500m
```

### DB 임시 리소스 증가
```
PostgreSQL이 대용량 리포트 처리 필요
    ↓ 메모리 1Gi → 4Gi resize
    ↓ 리포트 완료 후
    ↓ 메모리 4Gi → 1Gi resize
→ 재시작 없이, 다운타임 없이 처리
```

### Service Mesh 사이드카 튜닝
```
Envoy 프록시 트래픽 급증 대응
    ↓ CPU/메모리 동적 증가
    ↓ 메인 앱에 영향 없이 처리
```

### VPA 연동 (향후)
```
VPA → InPlaceOrRecreate 모드 (v1.33 beta)
    ↓ 가능하면 in-place resize
    ↓ 불가능하면 Pod 재생성
→ 완전 자동화된 수직 스케일링
```

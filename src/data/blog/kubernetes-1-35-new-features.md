---
title: "Kubernetes 1.35 신규 기능 총정리"
description: "Kubernetes 1.35 Timbernetes 릴리스의 주요 신규 기능과 변경 사항을 정리합니다. In-Place Pod Resource Updates, Image Volumes, IPVS Deprecation 등 60개 개선 사항을 다룹니다."
pubDate: 2026-03-02
tags: ["kubernetes", "cloud-native", "container", "devops"]
vaultSource: "2026.03/Kubernetes 1.35 신규 기능.md"
---

> 릴리스: 2026년 2월 10일 (v1.35.1)
> 코드명: Timbernetes (The World Tree Release)
> 총 60개 개선 사항: Stable 17개, Beta 19개, Alpha 22개

## 주요 신규 기능

### In-Place Pod Resource Updates (Stable)
- CPU와 메모리를 Pod 재시작 없이 조정 가능
- 워크로드 관리 효율성 대폭 향상
- 다운타임 없이 리소스 튜닝 가능

### Restart All Containers (Alpha)
- Pod의 전체 in-place 재시작 지원
- Pod 삭제/재생성 대비 효율적인 상태 리셋
- AI/ML 워크로드에 특히 유용
  - 애플리케이션 개발자는 핵심 학습 로직에 집중
  - 복잡한 실패 처리 및 복구는 사이드카에 위임 가능

### PreferSameNode Traffic Distribution (Stable)
- 서비스가 로컬 노드의 엔드포인트를 우선 처리
- 로컬에 없을 경우 원격 엔드포인트로 폴백
- 노드 내 트래픽 선호를 명시적으로 API에 반영

### StatefulSet MaxUnavailable (Beta)
- `maxUnavailable` 설정으로 병렬 Pod 업데이트 가능 (예: 3개 또는 10%)
- 데이터베이스 클러스터 같은 stateful 애플리케이션이 순차 업데이트 대비 최대 60% 빠른 업데이트
- 기존 one-at-a-time 업데이트 방식 개선

### Image Volumes (Stable)
- OCI 이미지를 레지스트리에서 가져와 읽기 전용 볼륨으로 Pod 내부에 직접 노출
- Kubernetes 1.35에서 안정 버전으로 승격
- 컨테이너 이미지를 데이터 소스로 활용 가능

### WebSocket Support for Streaming Connections
- 스트리밍 연결을 WebSocket으로 전환
- 양방향 통신의 현대적이고 널리 지원되는 표준
- 네트워킹 인프라 전반에서 안정성 및 호환성 향상

## 중요 변경 사항

### IPVS Mode Deprecation
- kube-proxy의 IPVS 모드 deprecated
- Kubernetes 1.36에서 제거 예정
- 대체 방안 검토 필요

### Containerd 1.x 지원 종료
- Kubernetes 1.35가 containerd 1.x를 지원하는 마지막 버전
- 다음 버전으로 업그레이드 전 **containerd 2.0 이상으로 전환 필수**

### Windows Server 2025 지원
- EKS 1.35에서 Windows Server 2025 지원 추가

## 보안 강화

- 17개의 보안 기능 변경
- 새로운 유효성 검사 추가
- 구형 기술 deprecated
- User namespaces 지원 확대

## AI/ML 워크로드 최적화

Kubernetes 1.35는 AI의 운영체제로 자리잡고 있으며, AI/ML 워크로드에 특화된 기능들이 대거 포함되었습니다:
- In-place Pod 재시작으로 학습 작업 복구 간소화
- GPU 리소스 효율적 관리
- 사이드카 패턴을 통한 복잡한 실패 처리 자동화

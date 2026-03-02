---
title: "Pod 재시작 없이 CPU/메모리를 바꾼다 — Kubernetes In-Place Pod Resize"
description: "Kubernetes 1.35에서 GA가 된 In-Place Pod Resize. Pod을 죽이지 않고 리소스를 동적으로 변경하는 원리, 실전 활용법, 주의사항을 정리합니다."
pubDate: 2026-03-02
tags: ["kubernetes", "pod", "resource-management", "devops"]
vaultSource: "2026.03/Kubernetes In-Place Pod Resize.md"
---

Kubernetes에서 Pod의 CPU/메모리를 변경하려면 어떻게 해야 할까? 지금까지는 답이 하나였다. **Pod을 죽이고 다시 만든다.**

Deployment의 resource를 변경하면 Rolling Update가 일어나고, 기존 Pod이 종료되고, 새 Pod이 생성된다. Stateless한 웹 서버라면 문제없다. 하지만 PostgreSQL을 재시작하면? 진행 중인 배치 작업이 있다면? 연결 중인 수천 개의 WebSocket 세션이 있다면?

Kubernetes 1.35에서 **In-Place Pod Resize**가 GA(Stable)로 승격되었다. Pod을 죽이지 않고, 실행 중인 컨테이너의 CPU와 메모리를 동적으로 변경할 수 있다.

## 7년 걸린 기능

KEP-1287이 처음 제안된 것은 2019년이다. 그로부터 7년:

| 버전 | 단계 | 시기 |
|------|------|------|
| v1.27 | Alpha | 2023 |
| v1.33 | Beta | 2025 |
| **v1.35** | **GA (Stable)** | **2026** |

왜 이렇게 오래 걸렸을까? Pod의 리소스는 Kubernetes 설계 초기부터 **불변(immutable)**으로 정의되었다. 이걸 mutable로 바꾸는 것은 API Server, Kubelet, Container Runtime, Scheduler 모두에 영향을 미치는 근본적인 변화였기 때문이다.

## 왜 필요했는가

리소스가 불변이면 생기는 문제들:

- **DB 재시작 = 다운타임**: PostgreSQL, MySQL 같은 Stateful 서비스는 Pod 재시작이 곧 서비스 중단
- **배치 작업 손실**: 3시간째 돌고 있는 ML 학습 Job의 메모리를 늘리려면 처음부터 다시 시작
- **Java 앱의 비효율**: JVM warm-up 시 CPU 2코어가 필요하지만, 안정화 후에는 0.5코어면 충분. 그런데 바꿀 수 없으니 2코어를 계속 점유
- **사이드카 튜닝 불가**: Envoy 프록시의 트래픽이 급증해도 메인 앱 전체를 재시작해야 사이드카 리소스를 변경 가능

이 모든 상황에서 "리소스만 바꾸고 싶은데 Pod을 죽여야 한다"는 것이 문제였다.

## 어떻게 동작하는가

내부 동작을 단계별로 보면:

```
[사용자]
  │
  ├─ kubectl patch pod --subresource resize
  │  (원하는 리소스 변경)
  ▼
[API Server]
  │
  ├─ desired resources를 spec에 기록
  ▼
[Kubelet]
  │
  ├─ 1. Feasibility Check
  │    "이 노드에 여유가 있는가?"
  │    ├─ Yes → 진행
  │    └─ No  → PodResizePending
  │
  ├─ 2. CRI UpdateContainerResources 호출
  ▼
[Container Runtime (containerd/CRI-O)]
  │
  ├─ 3. cgroup 설정 변경
  │    ├─ CPU: cpu.max, cpu.weight 조정
  │    └─ Memory: memory.max, memory.low 조정
  │
  └─ 4. 컨테이너 재시작 없이 즉시 적용
```

핵심은 **cgroup**이다. 리눅스 커널의 cgroup은 프로세스의 리소스 사용량을 제한하는 메커니즘인데, 이 값을 런타임에 바꿀 수 있다. 프로세스를 죽일 필요 없이 "너 이제부터 메모리 2GB까지만 써"라고 제한을 변경하는 것이다.

### 상태 확인

변경 후 실제 적용된 리소스는 `status`에서 확인한다:

- `spec.containers[*].resources` → 원하는(desired) 리소스
- `status.containerStatuses[*].resources` → 실제 적용된 리소스

두 값이 같으면 resize가 완료된 것이고, 다르면 아직 진행 중이거나 대기 상태다.

### Resize 상태 조건

| Condition | 의미 |
|-----------|------|
| **PodResizeInProgress** | resize가 수락되어 적용 중 |
| **PodResizePending** (Deferred) | 노드에 일시적으로 여유 없음, 나중에 재시도 |
| **PodResizePending** (Infeasible) | 해당 노드에서는 불가능 (노드 이동 필요) |

## 실전 사용법

### Pod 정의에 resizePolicy 추가

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
      restartPolicy: NotRequired      # CPU 변경 시 재시작 안 함
    - resourceName: memory
      restartPolicy: NotRequired      # 메모리 변경 시도 재시작 안 함
```

`resizePolicy`는 리소스별로 재시작 여부를 제어한다:
- `NotRequired`: 컨테이너 재시작 없이 변경 (기본값)
- `RestartContainer`: 변경 시 컨테이너를 재시작

메모리를 `RestartContainer`로 설정하는 경우도 있다. 일부 애플리케이션은 시작 시 할당된 메모리 크기를 기준으로 내부 버퍼를 잡는데, 런타임에 메모리가 늘어나도 그 버퍼 크기는 바뀌지 않기 때문이다 (JVM의 `-Xmx` 같은 경우).

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

### 결과 확인

```bash
# 실제 적용된 리소스
kubectl get pod resize-demo \
  -o jsonpath='{.status.containerStatuses[0].resources}'

# 재시작 없이 적용되었는지 (restartCount = 0이면 성공)
kubectl get pod resize-demo \
  -o jsonpath='{.status.containerStatuses[0].restartCount}'
```

## 실전 활용 시나리오

### 1. Java 앱 시작 최적화

JVM 기반 애플리케이션은 시작할 때 CPU를 많이 쓴다. 클래스 로딩, JIT 컴파일, warm-up 과정에서 CPU 2코어가 필요하지만, 안정화 후에는 500m이면 충분하다.

```
시작: CPU 2000m (JVM warm-up)
  ↓ 안정화 후 resize
운영: CPU 500m
  → 75% CPU 비용 절감
```

### 2. DB 임시 리소스 증가

PostgreSQL에서 대용량 리포트를 생성해야 한다. 평소에는 메모리 1Gi면 충분하지만, 리포트 처리에 4Gi가 필요하다.

```
평소: 메모리 1Gi
  ↓ 리포트 시작 전 resize
처리: 메모리 4Gi
  ↓ 리포트 완료 후 resize
복원: 메모리 1Gi
  → 재시작 없이, 다운타임 없이 처리
```

### 3. Service Mesh 사이드카 독립 튜닝

Envoy 사이드카의 트래픽이 급증했다. 메인 앱과 무관한 사이드카만 리소스를 올리고 싶다.

```
Envoy 사이드카: CPU 100m → 500m
  → 메인 앱 재시작 없이 사이드카만 조정
```

### 4. VPA 자동 연동 (미래)

Vertical Pod Autoscaler가 `InPlaceOrRecreate` 모드를 지원하기 시작했다 (v1.33 beta). 가능하면 in-place resize를 시도하고, 불가능할 때만 Pod을 재생성한다. 완전 자동화된 수직 스케일링이 현실이 되고 있다.

## v1.35 GA에서 달라진 것

이전 Beta 버전 대비 주목할 변화:

- **메모리 감소 허용**: Beta에서는 메모리 limit을 줄일 수 없었다. GA에서는 현재 사용량이 새 limit보다 낮을 때 감소 가능. OOM-kill을 방지하기 위해 best-effort로 동작한다
- **우선순위 기반 처리**: 노드에 여유가 부족할 때, 오래된 resize 요청부터 우선 처리
- **관측성 강화**: Kubelet 메트릭과 Pod 이벤트로 resize 과정을 추적 가능

## 알아둬야 할 제약사항

만능은 아니다. 쓰기 전에 이것들을 확인해야 한다:

1. **QoS 클래스 변경 불가**: Guaranteed에서 Burstable로 바뀌는 resize는 거부된다. requests와 limits의 관계가 기존 QoS를 유지해야 한다
2. **Static CPU/Memory Manager 비호환**: 노드에 static CPU Manager가 설정되어 있으면 resize가 Infeasible로 거부된다
3. **Swap 비호환**: 스왑이 활성화된 환경에서는 사용 불가
4. **CPU/메모리만**: GPU 등 다른 리소스 타입은 여전히 불변
5. **런타임 요구사항**: containerd 1.6.9+ 또는 CRI-O 필요

## Kubelet 재시작 시 안전한가?

안전하다. Kubelet은 체크포인트 파일(`allocated_pods_state`, `actuated_pods_state`)에 상태를 기록한다. Kubelet이 재시작되면:

1. 체크포인트에서 상태 복원
2. 기존 Pod은 현재 할당된 리소스 기준으로 재승인
3. 대기 중인 resize는 기존 Pod 처리 후 순서대로 진행

resize 도중에 Kubelet이 죽어도 데이터가 유실되지 않는다.

## 정리

In-Place Pod Resize는 "Pod의 리소스는 불변"이라는 Kubernetes의 오래된 제약을 깨뜨린 기능이다. 7년의 개발 끝에 GA가 되었고, DB 운영, 배치 처리, 사이드카 관리, 비용 최적화 등 실전에서 필요했던 시나리오들을 비로소 해결한다.

VPA의 InPlaceOrRecreate 모드와 결합하면, "사람이 리소스를 수동으로 조정"하는 시대가 끝나고 **완전 자동화된 수직 스케일링**의 시대가 시작될 것이다.

---
title: "kube-proxy IPVS가 Deprecated된 진짜 이유 — nftables 전환 가이드"
description: "Kubernetes 1.35에서 IPVS 모드가 deprecated되었다. 많은 사람들이 eBPF를 기대했지만, 선택된 것은 nftables였다. 그 배경과 마이그레이션 방법을 정리한다."
pubDate: 2026-03-02
tags: ["kubernetes", "networking", "nftables", "kube-proxy", "ebpf"]
vaultSource: "2026.03/Kubernetes IPVS Deprecated - nftables 전환.md"
---

Kubernetes 1.35에서 kube-proxy IPVS 모드가 공식 deprecated되었다. "다음은 당연히 eBPF겠지"라고 생각했다면 틀렸다. 선택된 것은 **nftables**다.

이 글에서는 왜 IPVS가 버려졌는지, 왜 eBPF가 아닌 nftables가 선택됐는지, 그리고 어떻게 마이그레이션하면 되는지를 정리한다.

## kube-proxy 모드의 역사 — 20년간의 진화

Kubernetes의 Service 네트워킹은 리눅스 커널의 패킷 처리 기술과 함께 진화해왔다.

```
iptables (2001~, kernel 2.4)
    ↓ 성능 문제 (linear O(n) rule 탐색)
IPVS (2017~, k8s 1.9 alpha)
    ↓ 유지보수 부담 + iptables 의존성 잔존
nftables (2024~, k8s 1.29 alpha → 1.33 GA)
```

**iptables**는 2001년부터 리눅스의 기본 패킷 필터링 도구였다. kube-proxy도 당연히 iptables를 사용했지만, Service 수가 늘어날수록 O(n) 선형 탐색이 병목이 됐다. 10,000개 Service가 있으면 매 패킷마다 10,000개 체인을 순차 탐색해야 했다.

**IPVS**는 이 문제를 풀기 위해 2017년(k8s 1.9) 도입됐다. hash table 기반 로드밸런싱으로 iptables보다 확실히 빨랐고, 대규모 클러스터에서 구원자처럼 보였다.

**nftables**는 2014년 커널 3.13에서 등장한 iptables의 공식 후속 기술이다. Kubernetes에는 1.29(2024)에서 alpha로 들어왔고, 1.33(2025)에서 GA가 됐다.

## IPVS가 Deprecated된 4가지 이유

### 1. 유지보수할 사람이 없다

SIG-Network는 세 개의 백엔드(iptables, IPVS, nftables)를 동시에 유지하고 있었다. 문제는 IPVS 코드베이스에 깊은 전문성을 가진 개발자가 거의 없다는 것이다. 버그는 쌓이고, 고칠 사람은 부족하고, 결국 "하나를 줄이자"는 결론에 이르렀다.

### 2. "iptables 탈출" 이라더니, 여전히 iptables에 의존

IPVS 모드의 아이러니는, IPVS 커널 API만으로는 Kubernetes Service를 완전히 구현할 수 없다는 점이다. NodePort, ExternalIP, 패킷 필터링 등을 위해 IPVS 모드에서도 iptables API를 대량 사용한다.

iptables에서 벗어나려면 어차피 이 부분을 nftables로 포팅해야 한다. 그 시점에서 IPVS 레이어의 존재 이유가 사라진다.

### 3. 좁은 문제만 해결한다

IPVS는 "빠른 로드밸런싱"이라는 한 가지 문제에 특화되어 있다. 하지만 Kubernetes 네트워킹은 로드밸런싱, 패킷 필터링, NAT, 연결 추적을 모두 다뤄야 한다. nftables는 이 모든 것을 하나의 프레임워크에서 통합 처리한다.

### 4. 커널에서도 더 이상 발전하지 않는다

IPVS도 iptables처럼 커널 커뮤니티에서 활발한 개발이 이루어지지 않는다. 새로운 기능과 성능 개선은 nftables와 eBPF에 집중되고 있다. deprecated 기술 위에 인프라를 쌓는 것은 시한폭탄이다.

## 왜 eBPF가 아닌 nftables인가?

이 부분이 가장 논쟁적이다. eBPF가 대세인데 왜 nftables를 선택했을까?

KEP-3866 문서에 이런 문장이 있다:

> *"eBPF is very trendy, but also notoriously difficult to work with."*

### eBPF를 선택하지 않은 이유

1. **커널 호환성**: eBPF에서 conntrack에 접근하는 API는 최신 커널에만 있다. NAT 연결을 위한 API는 kernel 6.1에서야 추가됐다. 대다수 Kubernetes 클러스터가 kernel 6.1 이상을 쓰기까지는 아직 시간이 필요하다.

2. **복잡성**: eBPF 기반 kube-proxy를 만들면 초기에 수많은 workaround가 필요하다. Cilium이 이 길을 먼저 걸었고, 그 복잡성을 누구보다 잘 안다.

3. **범용성 부족**: eBPF 솔루션은 Cilium, Calico 같은 특정 CNI에 묶인다. 업스트림 kube-proxy는 어떤 CNI와도 동작해야 하는데, eBPF로는 이 범용성을 보장하기 어렵다.

### nftables가 선택된 이유

1. **통합 인터페이스**: 패킷 필터링 + NAT + 로드밸런싱을 하나의 프레임워크로
2. **O(1) 해시맵 탐색**: verdict map으로 단일 hash lookup — iptables의 O(n)과 차원이 다르다
3. **Kubernetes와 궁합**: 규칙을 선언적으로 관리하는 방식이 Kubernetes 모델과 자연스럽게 맞는다
4. **낮은 커널 요구**: kernel 5.13+면 충분 (eBPF NAT는 6.1+ 필요)
5. **drop-in 교체**: 기존 kube-proxy 구조를 유지하면서 모드만 바꾸면 된다

## iptables vs nftables — 구조적 차이

차이를 직관적으로 보면 이렇다:

### iptables: 순차 탐색

```
Service A → Chain KUBE-SVC-A → Rule 1 (endpoint 1)
                              → Rule 2 (endpoint 2)
                              → Rule 3 (endpoint 3)
                              ... (10,000개 Service = 10,000개 체인)
```

매 패킷마다 규칙을 순차 탐색한다. Service가 많을수록 느려진다. **O(n)**.

### nftables: 해시 탐색

```
단일 규칙 + verdict map (hash table)
  {Service A IP:Port → endpoint set A}
  {Service B IP:Port → endpoint set B}
  ... (단일 hash lookup으로 처리)
```

Service가 10,000개든 100,000개든 단일 hash lookup이다. **O(1)**.

## 성능 비교

| 항목 | iptables | IPVS | nftables | eBPF (Cilium) |
|------|----------|------|----------|---------------|
| **룩업 방식** | 선형 O(n) | 해시 O(1) | 해시 O(1) | 해시 O(1) |
| **처리량** | 낮음 | 높음 | 80-90 Gbps | 100+ Gbps |
| **지연시간** | 높음 | 중간 | 100-200 µs | < 50 µs |
| **CPU 사용량** | 높음 | 중간 | 중간 | 25-40% 낮음 |
| **최소 커널** | 2.4+ | 2.6+ | 5.13+ | 6.1+ |
| **kube-proxy 필요** | Yes | Yes | Yes | No (대체) |
| **iptables 의존** | 전적 의존 | 부분 의존 | 없음 | 없음 |
| **상태** | 기본값 | **Deprecated** | **GA (권장)** | CNI 의존 |

nftables는 IPVS와 비슷한 성능을 내면서 iptables 의존을 완전히 끊었다. eBPF(Cilium)가 절대 성능에서는 앞서지만, CNI에 종속되고 커널 요구사항이 높다.

## 마이그레이션 가이드: IPVS → nftables

전환 자체는 간단하다.

### Step 1. 커널 확인

```bash
uname -r
# 5.13 이상 필요
```

### Step 2. kube-proxy 설정 변경

```yaml
# kube-proxy ConfigMap
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "nftables"  # 기존: "ipvs"
```

### Step 3. kube-proxy 재시작

```bash
kubectl rollout restart daemonset/kube-proxy -n kube-system
```

### Step 4. CNI 호환성 확인

Calico를 사용 중이라면 v3.30 이상이 필요하다. Cilium 사용자는 이미 kube-proxy를 우회하고 있을 가능성이 높다.

### 주의사항

- **NodePort 바인딩**: nftables 모드는 기본적으로 노드의 기본 인터페이스에서만 NodePort를 수신한다. `127.0.0.1`에서는 수신하지 않으므로, 로컬 테스트 시 주의가 필요하다.
- **방화벽**: nftables 모드는 자동으로 방화벽에 구멍을 뚫지 않는다. 노드 방화벽이 있다면 적절히 설정해야 한다.
- **conntrack workaround**: 명시적으로 설정해야 적용된다.

## 그래서 eBPF는?

nftables는 **업스트림 kube-proxy의 공식 방향**이다. 하지만 eBPF는 별도의 길을 가고 있다. CNI 레벨에서 kube-proxy를 **완전히 대체**하는 경로다.

- **Cilium**: eBPF 기반, kube-proxy 완전 대체, 100+ Gbps, DSR(Direct Server Return) 지원
- **Calico eBPF**: kube-proxy 우회, 낮은 지연시간, 소스 IP 보존

**선택 기준은 명확하다:**

> 고성능이 필요한 대규모 클러스터에서는 eBPF(Cilium/Calico)를 선택하고,
> 표준적이고 안정적인 운영이 목표라면 nftables를 선택하면 된다.

대부분의 클러스터에서는 nftables로 충분하다. eBPF는 수천 개 노드, 수만 RPS 이상의 트래픽을 처리하는 환경에서 진가를 발휘한다.

## 타임라인

| 버전 | 변경사항 |
|------|---------|
| v1.29 (2024) | nftables 모드 Alpha 도입 (KEP-3866) |
| v1.31 (2025) | nftables 모드 Beta |
| v1.33 (2025) | nftables 모드 **GA** |
| v1.35 (2026) | IPVS 모드 **Deprecated** |
| v1.36 (2026 예정) | IPVS 모드 제거 예정 |

v1.36에서 IPVS가 완전히 제거될 예정이니, IPVS를 쓰고 있다면 지금이 전환할 때다. 급할 건 없지만, 미룰 이유도 없다.

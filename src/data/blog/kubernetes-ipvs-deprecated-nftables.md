---
title: "Kubernetes IPVS Deprecated - nftables 전환 가이드"
description: "Kubernetes 1.35에서 IPVS가 deprecated된 이유와 nftables가 선택된 배경, eBPF와의 비교, 마이그레이션 방법을 정리합니다."
pubDate: 2026-03-02
tags: ["kubernetes", "networking", "nftables", "kube-proxy"]
vaultSource: "2026.03/Kubernetes IPVS Deprecated - nftables 전환.md"
---

> Kubernetes 1.35에서 kube-proxy IPVS 모드가 공식 deprecated되었다.
> 대체 백엔드는 eBPF가 아닌 **nftables**로 결정되었다.

## 배경: kube-proxy 모드의 역사

```
iptables (2001~, kernel 2.4)
    ↓ 성능 문제 (linear O(n) rule 탐색)
IPVS (2017~, k8s 1.9 alpha)
    ↓ 유지보수 부담 + iptables 의존성
nftables (2024~, k8s 1.29 alpha → 1.33 GA)
```

- **iptables 모드**: 2001년부터 리눅스 기본 패킷 필터링. Service 수 증가 시 O(n) 선형 탐색으로 성능 저하
- **IPVS 모드**: hash table 기반 로드밸런싱으로 iptables보다 빠름. 2017년 k8s 1.9에서 alpha 도입
- **nftables 모드**: 2014년 kernel 3.13에서 등장한 iptables 후속. k8s 1.29 alpha → 1.31 beta → 1.33 GA

## IPVS가 Deprecated된 이유

### 1. 유지보수 인력 부족
IPVS 코드베이스에 대한 깊은 전문성을 가진 개발자 부족으로, 버그 수정과 기능 유지가 어려워졌다. SIG-Network는 3개 백엔드(iptables, ipvs, nftables) 동시 유지의 부담을 줄이기로 결정했다.

### 2. IPVS는 여전히 iptables에 의존
IPVS 커널 API만으로는 Kubernetes Service를 완전히 구현할 수 없어, IPVS 모드에서도 iptables API를 대량 사용한다. iptables에서 벗어나려면 어차피 nftables로 포팅이 필요한데, 그 시점에서 IPVS의 존재 이유가 사라진다.

### 3. 기능 범위의 한계
IPVS는 "빠른 로드밸런싱"이라는 좁은 문제만 해결한다. Kubernetes 네트워킹은 그 범위를 훨씬 넘어섰고, nftables가 로드밸런싱 + 패킷 필터링 + NAT를 통합 처리한다.

### 4. 더 이상 능동적으로 개발되지 않는 기술
IPVS도 iptables처럼 커널에서 활발한 개발이 이루어지지 않는다. 새로운 기능과 성능 개선은 nftables에 집중되고 있다.

## nftables가 선택된 이유 (eBPF가 아닌)

### 왜 eBPF가 아닌가?

> "eBPF is very trendy, but also notoriously difficult to work with."
> — KEP-3866

1. **커널 호환성 문제**: eBPF에서 conntrack 정보에 접근하는 API는 최신 커널에만 존재. NAT 연결을 위한 API는 kernel 6.1에서야 추가됨. 대다수 Kubernetes 사용자가 해당 커널을 사용하기까지 오랜 시간이 필요
2. **복잡성**: eBPF 기반 kube-proxy는 초기에 많은 workaround가 필요하여 복잡도 증가
3. **표준화 어려움**: eBPF는 CNI 플러그인(Cilium, Calico 등)에 의존적이며, 업스트림 kube-proxy에 범용적으로 적용하기 어려움

### nftables의 장점

1. **통합 인터페이스**: 패킷 필터링, NAT, 로드밸런싱을 하나의 프레임워크로 통합
2. **O(1) 해시맵 탐색**: iptables의 O(n) 선형 탐색 대신 verdict map으로 단일 hash table lookup
3. **Kubernetes 선언적 모델과 정합**: 규칙 관리 방식이 Kubernetes의 선언적 모델과 자연스럽게 일치
4. **낮은 커널 요구사항**: kernel 5.13+ (eBPF NAT는 6.1+ 필요)
5. **drop-in 교체 가능**: 기존 kube-proxy 구조를 유지하면서 모드만 변경

## 성능 비교

| 항목 | iptables | IPVS | nftables | eBPF (Cilium) |
|------|----------|------|----------|---------------|
| **룩업 방식** | 선형 O(n) | 해시 O(1) | 해시 O(1) | 해시 O(1) |
| **처리량** | 낮음 | 높음 | 80-90 Gbps | 100+ Gbps |
| **지연시간** | 높음 | 중간 | 100-200 µs | < 50 µs |
| **CPU 사용량** | 높음 | 중간 | 중간 | 25-40% 낮음 |
| **커널 요구** | 2.4+ | 2.6+ | 5.13+ | 6.1+ |
| **kube-proxy 필요** | Yes | Yes | Yes | No (대체) |
| **iptables 의존** | 전적 의존 | 부분 의존 | 없음 | 없음 |
| **상태** | 기본값 (유지) | **Deprecated** | GA (권장) | CNI 의존 |

## nftables vs iptables 구조 비교

### iptables 방식
```
Service A → Chain KUBE-SVC-A → Rule 1 (endpoint 1)
                              → Rule 2 (endpoint 2)
                              → Rule 3 (endpoint 3)
                              ... (10,000개 Service = 10,000개 체인)
```
매 패킷마다 순차적으로 규칙을 탐색 → **O(n)**

### nftables 방식
```
단일 규칙 + verdict map (hash table)
  {Service A IP:Port → endpoint set A}
  {Service B IP:Port → endpoint set B}
  ... (단일 hash lookup으로 처리)
```
해시맵에서 단일 lookup → **O(1)**

## 마이그레이션 방법

### IPVS → nftables 전환

1. kube-proxy ConfigMap에서 모드 변경:
```yaml
# kube-proxy ConfigMap
mode: "nftables"  # 기존: "ipvs"
```

2. kube-proxy DaemonSet 재시작
3. 커널 요구사항 확인: Linux kernel 5.13+
4. CNI 호환성 확인: Calico의 경우 v3.30+ 필요

### 주의사항
- nftables 모드는 기본적으로 NodePort를 노드의 기본 인터페이스에서만 수신 (127.0.0.1에서는 수신 안 함)
- 노드 방화벽이 있는 경우 적절한 설정 필요 (자동으로 방화벽에 구멍을 뚫지 않음)
- conntrack 버그 workaround는 명시적으로 설정해야 적용

## eBPF는 어디에 위치하는가?

nftables는 **업스트림 kube-proxy의 공식 방향**이다. 하지만 eBPF는 **CNI 레벨에서** kube-proxy를 완전히 대체하는 별도의 경로로 존재한다:

- **Cilium**: eBPF 기반, kube-proxy 완전 대체, 100+ Gbps, DSR 지원
- **Calico eBPF 데이터플레인**: kube-proxy 우회, 낮은 지연시간, 소스 IP 보존

> 고성능이 필요한 대규모 클러스터에서는 eBPF(Cilium/Calico)를 선택하고,
> 표준적이고 안정적인 운영이 목표라면 nftables를 선택하는 것이 합리적이다.

## 타임라인

| 버전 | 변경사항 |
|------|---------|
| v1.29 (2024) | nftables 모드 Alpha 도입 (KEP-3866) |
| v1.31 (2025) | nftables 모드 Beta |
| v1.33 (2025) | nftables 모드 **GA** |
| v1.35 (2026) | IPVS 모드 **Deprecated** |
| v1.36 (2026 예정) | IPVS 모드 제거 예정 |

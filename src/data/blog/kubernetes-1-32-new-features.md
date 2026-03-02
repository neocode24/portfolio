---
title: "Kubernetes 1.32 Penelope — 10주년을 기념한 44개의 개선"
description: "Kubernetes 10주년 기념 릴리스 1.32 Penelope의 주요 신규 기능을 정리합니다. Custom Resource Field Selectors GA, DRA Beta, Sidecar Containers 업데이트 등 44개 개선 사항을 다룹니다."
pubDate: 2026-03-02
tags: ["kubernetes", "cloud-native", "container"]
vaultSource: "2026.02/Kubernetes 1.32 신규 기능.md"
draft: true
---

Kubernetes가 10살이 됐다. 2014년 6월 Google이 오픈소스로 공개한 이후 10년, v1.32 코드명은 Penelope다. 호메로스의 오디세이에서 오디세우스를 10년간 기다리며 베틀을 짠 페넬로페처럼, Kubernetes도 10년간 한 땀 한 땀 개선을 이어왔다는 의미를 담았다.

이 릴리스에는 총 44개의 개선 사항이 포함되어 있다. GA 졸업 13개, Beta 진입 12개, Alpha 진입 19개.

## GA로 졸업한 핵심 기능들

10년간 Alpha, Beta를 거쳐 드디어 안정 단계에 도달한 기능들이다.

**Custom Resource Field Selectors** — 커스텀 리소스에도 이제 필드 셀렉터를 추가할 수 있다. 기존에는 내장 Kubernetes 객체에만 가능했던 필드 기반 필터링이 CRD에도 적용된다. Operator 개발자에게 반가운 소식이다.

**Memory-Backed Volumes 크기 조정** — Pod 리소스 제한에 따라 메모리 기반 볼륨이 동적으로 크기가 조정된다. 워크로드 이식성과 노드 리소스 활용도가 함께 개선된다.

**Bound Service Account Token 개선** — 서비스 어카운트 토큰 클레임에 노드 이름이 포함된다. 이를 통해 ValidatingAdmissionPolicy에서 노드 정보를 활용한 인증, 승인이 가능해졌다. 서비스 어카운트 자격 증명이 노드 권한 상승 경로가 되는 것을 차단하는 보안 강화다.

**StatefulSet PVC 자동 삭제** — StatefulSet이 생성한 PersistentVolumeClaim을 자동으로 정리한다. 고아 PVC가 쌓이는 문제가 해결된다.

**Memory Manager GA** — 컨테이너에 더 효율적이고 예측 가능한 메모리 할당을 제공한다.

## Beta로 올라온 기능들

**Job API Managed-By** — 외부 컨트롤러(Kueue 등)가 Job 동기화를 직접 관리할 수 있다. 고급 워크로드 관리 시스템과의 통합이 유연해진다.

**Dynamic Resource Allocation 구조화된 파라미터** — GPU, FPGA, 네트워크 어댑터 같은 특수 하드웨어 할당이 더 유연해졌다. 머신러닝과 고성능 컴퓨팅 워크로드를 위한 핵심 기능이다.

## 운영자를 위한 개선

**Kubelet Systemd Watchdog** — systemd watchdog과 통합되어 kubelet 상태 점검이 실패하면 자동으로 재시작된다. 재시작 횟수 제한도 설정할 수 있어서 무한 루프를 방지한다.

**이미지 Pull Back-Off 에러 메시지 개선** — ImagePullBackOff가 발생했을 때 더 명확한 에러 메시지를 제공한다. 근본 원인 파악이 훨� 쉬워진다.

**kubectl Debug 커스텀 프로파일링** — 환경 변수, 볼륨 마운트, 보안 컨텍스트를 포함한 커스텀 JSON 프로파일을 정의하고 재사용할 수 있다.

## 보안과 Observability

**EKS 익명 인증 제한** — Amazon EKS 1.32부터 익명 인증이 헬스 체크 엔드포인트로만 제한된다. 의도하지 않은 클러스터 접근을 원천 차단한다.

**Kubelet Tracing** — OpenTelemetry 형식으로 gRPC 및 HTTP API 요청 트레이스를 내보낼 수 있다. 클러스터 디버깅의 가시성이 한 단계 올라간다.

## 돌아보며

1.32는 화려한 신기능보다는 기존 기능의 안정화에 집중한 릴리스다. GA 졸업 13개라는 숫자가 이를 증명한다. 10년간 쌓아온 기능들을 정리하고 다듬는 릴리스, 코드명 Penelope에 걸맞는 성격이다.

다만 이 버전은 2026년 2월 28일부로 지원이 종료되었다. 아직 1.32를 운영 중이라면 1.34 이상으로의 업그레이드를 권장한다.

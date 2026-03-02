---
title: "LiteLLM AI Gateway - 100개 이상의 LLM을 하나의 API로"
description: "LiteLLM의 핵심 개념, Python SDK와 Proxy Server 이중 배포 모델, 주요 기능, 배포 옵션, 최신 업데이트를 정리합니다."
pubDate: 2026-03-02
tags: ["ai", "llm", "gateway", "openai", "devops"]
vaultSource: "2026.02/LiteLLM AI Gateway.md"
---

> 프로젝트: BerriAI/litellm
> 최신 버전: v1.80.15-stable (2026년 1월)
> 라이센스: Open Core 모델

LiteLLM은 100개 이상의 LLM API를 OpenAI 형식으로 호출할 수 있는 오픈소스 Python SDK 및 AI Gateway(Proxy Server)이다.

## 개요

### 핵심 개념
- **통합 인터페이스**: 100개 이상의 LLM을 단일 OpenAI 스타일 API로 사용
- **이중 배포 모델**: Python SDK (애플리케이션 내 통합) 또는 AI Gateway (중앙화된 프록시 서버)
- **비용 추적**: 프로젝트/사용자별 비용 관리 및 예산 설정
- **엔터프라이즈 준비**: 인증, 인가, 로드 밸런싱, 가드레일, 로깅 기능

### 주요 특징
- 8ms P95 latency @ 1,000 RPS의 높은 성능
- -stable 태그 Docker 이미지는 12시간 부하 테스트 통과
- OpenAI 호환 엔드포인트 제공
- 다중 테넌시 지원

## 지원 LLM 제공자

LiteLLM이 지원하는 주요 LLM 제공자:
- **클라우드**: OpenAI, Azure OpenAI, Anthropic, Google VertexAI, AWS Bedrock, Cohere
- **오픈소스**: HuggingFace, VLLM, Ollama
- **엔터프라이즈**: AWS Sagemaker, NVIDIA NIM
- **기타**: Together.ai, Replicate, Groq

총 100개 이상의 LLM API를 단일 인터페이스로 통합

## 아키텍처

### 1. Python SDK (In-Process)
애플리케이션에 직접 통합하는 라이브러리
- Router: 여러 배포본 간 retry/fallback 로직
- Load Balancing: 애플리케이션 레벨 부하 분산
- Cost Tracking: SDK 내장 비용 추적
- Observability: Lunary, MLflow, Langfuse 등과 통합

### 2. Proxy Server (AI Gateway)
독립 실행형 중앙화 게이트웨이
- **인증/인가**: Virtual Key 기반 접근 제어
- **멀티 테넌시**: 프로젝트/사용자별 비용 추적 및 예산 관리
- **프로젝트별 커스터마이징**: 로깅, 가드레일, 캐싱 설정
- **Admin Dashboard**: 모니터링 및 관리 UI

### 배포 옵션

#### Self-Hosted (On-Premise / Cloud VM)
```bash
# 1. 환경 변수 설정
export DATABASE_URL=postgres://...
export REDIS_HOST=...

# 2. YAML 설정으로 프록시 시작
litellm --config config.yaml
```

- 완전한 데이터 제어
- 규제 산업에 적합
- Postgres + Redis 필요

#### 컨테이너 배포 (Kubernetes)
- Kubernetes manifest 및 Terraform 템플릿 제공
- AWS 참조 아키텍처:
  - Amazon ECS/EKS with Autoscaling
  - RDS (Postgres)
  - ElastiCache (Redis)
  - Cognito/SSO 통합

## 주요 기능

### Gateway 기능
- 중앙화된 API 접근 with 인증/인가
- 프로젝트/사용자별 비용 추적 및 지출 관리
- 프로젝트별 로깅, 가드레일, 캐싱 커스터마이징
- Virtual Key를 통한 안전한 접근 제어
- Admin Dashboard UI로 모니터링

### SDK 기능
- 여러 배포본 간 retry/fallback 로직을 가진 Router
- 애플리케이션 레벨 로드 밸런싱 및 비용 추적
- OpenAI 호환 에러 핸들링
- Observability 콜백 (Lunary, MLflow, Langfuse)

### 지원 엔드포인트 (OpenAI 호환)
- `/chat/completions`
- `/messages`
- `/embeddings`
- `/image/generations`
- `/audio/transcriptions`, `/audio/speech`
- `/batches`
- `/rerank`

## 2026년 최신 업데이트

### v1.80.15-stable (2026년 1월)
- Manus API 지원 추가
- MiniMax Provider 완전 지원
- AWS Polly TTS 통합
- SSO Role Mapping 기능
- Cost Estimator UI 도구
- MCP Global Mode 지원

### MCP Gateway
LiteLLM Proxy는 MCP Gateway를 제공하여:
- 모든 MCP 도구에 대한 고정 엔드포인트 제공
- Key 및 Team별 MCP 접근 제어

## 사용 사례

### Gen AI Enablement Teams
조직의 LLM 접근을 위한 중앙 게이트웨이

### ML Platform Teams
여러 LLM 배포를 관리하기 위한 인프라

### 개발자
LLM 프로젝트를 위한 직접 SDK 통합

### 엔터프라이즈
LLM 사용 전반의 비용 제어 및 거버넌스

## 가격 정책

### Open Source (Free)
- Docker 이미지 무료 사용 가능
- Routing, Load Balancing
- 기본 Logging 기능

### Enterprise
- SSO, RBAC
- 팀 레벨 예산 관리
- 고급 기능
- Contact Sales

## 성능

- **Latency**: 8ms P95 @ 1,000 RPS
- **안정성**: -stable 태그 이미지는 12시간 부하 테스트 통과
- **확장성**: Autoscaling 지원 (ECS/EKS)

## 주요 사용 기업

- Stripe
- Google
- Netflix
- OpenAI Agents SDK

## 설치 및 시작

### Python SDK
```python
pip install litellm

from litellm import completion

response = completion(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Proxy Server (Docker)
```bash
docker run -p 4000:4000 \
  -e DATABASE_URL=postgres://... \
  -e REDIS_HOST=... \
  ghcr.io/berriai/litellm:main-stable
```

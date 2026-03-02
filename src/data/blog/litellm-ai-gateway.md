---
title: "LiteLLM — LLM API를 직접 호출하면 안 되는 이유와 AI Gateway의 가치"
description: "100개 이상의 LLM을 OpenAI 형식으로 통합하는 LiteLLM의 아키텍처, SDK와 Proxy Server의 차이, 실제 도입 시 고려사항을 다룹니다."
pubDate: 2026-03-02
tags: ["ai", "llm", "gateway", "openai", "devops", "kubernetes"]
vaultSource: "2026.02/LiteLLM AI Gateway.md"
---

팀에서 LLM을 쓰기 시작하면 처음에는 간단하다. OpenAI API 키 하나 발급받아서 호출하면 된다. 그런데 시간이 지나면 문제가 생긴다.

- 팀원 A는 GPT-4를, 팀원 B는 Claude를, 팀원 C는 Gemini를 쓰고 싶다
- 각 API의 요청/응답 형식이 다르다
- 이번 달 LLM 비용이 얼마인지 아무도 모른다
- 특정 프로젝트가 예산의 80%를 소진하고 있다
- API 키가 코드에 하드코딩되어 있다

**LiteLLM**은 이 문제를 해결한다. 100개 이상의 LLM API를 OpenAI 형식 하나로 통합하는 오픈소스 AI Gateway다.

## 핵심 아이디어: 하나의 인터페이스로 모든 LLM을

LiteLLM의 핵심은 단순하다. **어떤 LLM을 호출하든 OpenAI SDK와 동일한 형식을 쓴다.**

```python
from litellm import completion

# OpenAI
response = completion(model="gpt-4", messages=[...])

# Anthropic Claude — 같은 형식
response = completion(model="claude-3-opus", messages=[...])

# Google Gemini — 여전히 같은 형식
response = completion(model="gemini-pro", messages=[...])
```

모델 이름만 바꾸면 된다. 요청/응답 형식, 에러 핸들링, 스트리밍 방식 모두 OpenAI 호환으로 통일된다. 코드를 한 줄도 안 바꾸고 모델을 교체할 수 있다는 뜻이다.

지원 범위는 넓다:
- **클라우드**: OpenAI, Azure OpenAI, Anthropic, Google VertexAI, AWS Bedrock, Cohere
- **오픈소스**: HuggingFace, VLLM, Ollama
- **엔터프라이즈**: AWS Sagemaker, NVIDIA NIM
- **기타**: Together.ai, Replicate, Groq

## 두 가지 사용 방식: SDK vs Proxy

LiteLLM은 두 가지 모드로 사용할 수 있다. 이 구분을 이해하는 것이 중요하다.

### 1. Python SDK — 애플리케이션에 직접 내장

```python
pip install litellm
```

애플리케이션 코드에 라이브러리로 통합한다. 별도 서버가 필요 없다.

- **Router**: 여러 모델 간 retry/fallback 자동 처리. GPT-4가 실패하면 Claude로 폴백
- **Load Balancing**: 같은 모델의 여러 배포본에 부하 분산
- **Cost Tracking**: 호출마다 비용 자동 계산
- **Observability**: Langfuse, MLflow 등으로 로그 전송

**적합한 경우**: 단일 서비스에서 LLM을 호출하거나, 인프라를 추가하고 싶지 않을 때.

### 2. Proxy Server (AI Gateway) — 중앙화된 관문

```bash
docker run -p 4000:4000 \
  -e DATABASE_URL=postgres://... \
  ghcr.io/berriai/litellm:main-stable
```

독립 프로세스로 실행되는 프록시 서버다. 모든 LLM 호출이 이 게이트웨이를 경유한다.

- **인증/인가**: Virtual Key로 접근 제어. API 키를 개발자에게 직접 주지 않아도 됨
- **멀티 테넌시**: 프로젝트/사용자별 비용 추적과 예산 한도 설정
- **가드레일**: 프롬프트 검증, 응답 필터링, 캐싱 정책을 프로젝트별로 설정
- **Admin Dashboard**: 사용량, 비용, 에러율을 한눈에 모니터링

**적합한 경우**: 여러 팀이 LLM을 사용하고, 비용과 접근을 중앙에서 관리해야 할 때.

## 왜 Gateway가 필요한가

"그냥 API 키 관리하면 되지, 왜 별도 서버를 띄우나?"라고 생각할 수 있다. Gateway의 진짜 가치는 **조직이 커질수록** 드러난다.

### 비용 가시성

LLM 비용은 눈에 안 보인다. 개발자가 실험하면서 쓰는 건 얼마 안 되는 것 같지만, 프로덕션에 올라가면 순식간에 커진다. LiteLLM Gateway는 프로젝트별, 사용자별, 모델별로 비용을 추적하고 예산 한도를 설정할 수 있다.

### API 키 중앙 관리

개발자마다 OpenAI 키를 가지고 있으면 통제가 안 된다. Gateway를 통해 Virtual Key를 발급하면, 실제 API 키는 Gateway에만 있고 개발자는 Virtual Key만 사용한다. 퇴사자가 생겨도 Virtual Key만 폐기하면 된다.

### 모델 교체의 자유

GPT-4에서 Claude로 바꾸고 싶을 때, 코드를 수정하지 않고 Gateway 설정만 변경하면 된다. A/B 테스트도 가능하다. 같은 요청의 50%는 GPT-4로, 50%는 Claude로 보내서 비교할 수 있다.

## 배포 옵션

### Self-Hosted

```bash
# YAML 설정으로 프록시 시작
litellm --config config.yaml
```

Postgres + Redis가 필요하다. 완전한 데이터 제어가 가능하고, 규제 산업에서 필수적이다.

### Kubernetes 배포

Kubernetes manifest와 Terraform 템플릿을 제공한다. AWS 참조 아키텍처도 있다:

- Amazon ECS/EKS with Autoscaling
- RDS (Postgres)
- ElastiCache (Redis)
- Cognito/SSO 통합

### 지원 엔드포인트 (OpenAI 호환)

Gateway를 거치는 모든 요청이 OpenAI 형식을 따른다:

- `/chat/completions` — 텍스트 생성
- `/messages` — Anthropic Messages API 호환
- `/embeddings` — 벡터 임베딩
- `/image/generations` — 이미지 생성
- `/audio/transcriptions`, `/audio/speech` — 음성 처리
- `/batches` — 배치 처리
- `/rerank` — 리랭킹

## 성능

- **Latency**: P95 8ms @ 1,000 RPS — Gateway 자체의 오버헤드가 거의 없다
- **안정성**: `-stable` 태그 이미지는 12시간 부하 테스트를 통과한 검증된 빌드
- **확장성**: ECS/EKS Autoscaling으로 트래픽에 따라 자동 스케일링

P95 8ms라는 수치가 의미하는 것은, LLM API 호출 자체가 수 초~수십 초인데 Gateway를 거쳐도 추가 지연이 사실상 없다는 뜻이다.

## 2026년 최신 업데이트 (v1.80.15-stable)

- **Manus API 지원** — 새로운 AI 에이전트 플랫폼 통합
- **MCP Global Mode** — Model Context Protocol 기반 도구를 Gateway 레벨에서 관리
- **SSO Role Mapping** — 엔터프라이즈 SSO와 역할 매핑
- **Cost Estimator UI** — 호출 전 비용 추정 도구
- **AWS Polly TTS** — 음성 합성 통합

특히 MCP Gateway가 흥미롭다. 모든 MCP 도구에 대한 고정 엔드포인트를 제공하고, Key 및 Team별로 MCP 접근을 제어할 수 있다. AI 에이전트 시대에 도구 접근 관리가 점점 중요해지고 있다.

## 누가 쓰고 있는가

- **Stripe** — 결제 인프라 기업의 LLM 통합
- **Google** — 내부 LLM 라우팅에 활용
- **Netflix** — 콘텐츠 관련 AI 파이프라인
- **OpenAI Agents SDK** — 에이전트 프레임워크의 LLM 라우팅 레이어

이름만 보면 대단하지만, 현실적인 면도 봐야 한다.

## 솔직한 평가

LiteLLM은 강력하지만, 2026년 1월 기준 GitHub에 **800개 이상의 미해결 이슈**가 있다. 활발한 개발이 진행 중이라는 뜻이기도 하지만, 프로덕션에 올리기 전에 충분한 테스트가 필요하다.

### 장점
- 100개 이상 LLM의 통합 인터페이스 — 이 부분은 압도적
- OpenAI 호환이라 기존 코드 마이그레이션이 쉬움
- Self-hosted 가능 — 데이터 주권 확보
- 오픈소스 (Open Core 모델)

### 주의점
- 미해결 이슈가 많음 — 특정 Provider에서 예상치 못한 동작 가능
- Proxy Server 운영 시 Postgres + Redis 인프라 부담
- Enterprise 기능(SSO, RBAC)은 유료
- 빠른 릴리스 주기 — 버전 간 breaking change 가능성

## 시작하기

가볍게 시작하려면 SDK부터:

```python
pip install litellm

from litellm import completion

response = completion(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

조직 단위로 도입하려면 Proxy Server:

```bash
docker run -p 4000:4000 \
  -e DATABASE_URL=postgres://... \
  -e REDIS_HOST=... \
  ghcr.io/berriai/litellm:main-stable
```

개인 프로젝트에서는 SDK로 충분하다. 팀이 3명을 넘거나, "이번 달 LLM 비용이 얼마지?"라는 질문이 나올 때가 Gateway를 도입할 타이밍이다.

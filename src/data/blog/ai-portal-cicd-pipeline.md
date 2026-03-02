---
title: "모노레포 CI/CD 실전 구성 — PR Preview부터 자동 정리까지"
description: "Next.js + NestJS 모노레포에서 GitHub Actions, ArgoCD, AKS로 구축한 CI/CD 파이프라인. PR별 격리 Preview 환경, 변경 감지 기반 선택적 빌드, GitOps 배포, 자동 cleanup을 다룹니다."
pubDate: 2026-03-02
tags: ["devops", "cicd", "kubernetes", "gitops", "github-actions"]
vaultSource: "2026.02/AI Portal CI-CD Pipeline 구조.md"
---

코드 리뷰에서 "로컬에서 띄워봐야 알 것 같아요"라는 코멘트가 달린다. 리뷰어가 직접 git checkout하고, 의존성 설치하고, 서비스를 띄워야 동작을 확인할 수 있다. 프론트엔드와 API가 모노레포에 같이 있으면 환경 설정은 더 복잡해진다.

PR을 올리면 격리된 Preview 환경이 자동으로 뜨고, 리뷰어가 URL 하나로 동작을 확인하고, PR을 닫으면 환경이 자동으로 사라진다. 이 글은 Next.js와 NestJS를 Nx 모노레포로 구성한 프로젝트에서 GitHub Actions, ArgoCD, AKS를 조합해 이 파이프라인을 구축한 경험이다.

## 세 개의 워크플로우

파이프라인의 뼈대는 단순하다. Git 이벤트 세 가지에 GitHub Actions 워크플로우 세 개가 1:1로 대응한다.

| 워크플로우 | 트리거 | 역할 |
|-----------|--------|------|
| ci.yml | PR 생성, 업데이트 | 변경 감지, 린트, 테스트, 빌드, Preview 배포 |
| deploy-sandbox.yml | main push | Web/API 병렬 빌드, Sandbox 배포 |
| cleanup-preview.yml | PR close | Preview 환경 완전 정리 |

PR이 열리면 환경이 생기고, 머지되면 Sandbox에 반영되고, 닫히면 정리된다. 이 흐름 안에서 사람이 하는 일은 코드 작성과 리뷰 승인뿐이다.

## 변경된 것만 빌드하는 CI Pipeline

모노레포에서 가장 흔한 실수는 API 한 줄 고쳤는데 프론트엔드까지 빌드하는 것이다. 이 파이프라인은 두 겹의 필터링으로 이 문제를 해결한다.

### Phase 0 — 변경 감지

CI의 첫 단계는 뭐가 바뀌었는지 파악하는 것이다. dorny/paths-filter 액션이 변경된 파일 경로를 분석해서 영역별 플래그를 설정한다.

| 영역 | 감지 경로 |
|------|-----------|
| web | apps/web, libs, package.json, pnpm-lock.yaml |
| api | apps/api, libs, package.json, pnpm-lock.yaml |
| libs | libs |

Web만 바뀌었으면 API 관련 단계를 전부 건너뛴다. 공유 라이브러리가 바뀌면 양쪽 모두 빌드한다.

### Phase 1-2 — Lint과 Test

Nx의 affected 명령이 두 번째 필터다. `pnpm nx affected -t test`는 모노레포의 의존성 그래프를 분석해서 실제로 영향받는 프로젝트만 테스트한다. libs 안에 패키지가 여러 개 있어도 의존 관계가 없는 패키지는 건너뛴다.

테스트는 매트릭스 전략으로 병렬 실행한다. API 테스트와 라이브러리 테스트가 동시에 돌아간다. Web 프론트엔드 단위테스트는 E2E로 대체했다.

동시성 제어도 추가했다. concurrency 그룹에 PR 번호를 넣고 cancel-in-progress를 true로 설정하면, 같은 PR에 커밋을 연속으로 push할 때 이전 CI가 자동 취소된다. 오타 수정 커밋을 push할 때마다 이전 빌드 완료를 기다리지 않아도 된다.

### Phase 3 — Build and Push

Web(Next.js)과 API(NestJS)를 각각 Docker 이미지로 빌드하고 Azure ACR에 push한다.

이미지 태그는 환경별로 다르게 관리한다.

| 환경 | 태그 패턴 | 예시 |
|------|-----------|------|
| PR Preview | pr-번호-SHA | pr-42-a1b2c3d |
| Sandbox | 날짜시간-SHA + latest | 20260302-143000-a1b2c3d |

PR 태그에는 latest를 붙이지 않는다. Preview 환경은 특정 커밋의 결과를 확인하는 곳이니까, 태그가 고정되어야 한다.

## PR별 완전히 격리된 Preview 환경

이 파이프라인에서 가장 공들인 부분이다. PR마다 독립된 환경이 자동으로 생성된다. 격리는 세 가지 차원으로 이루어진다.

**Kubernetes 네임스페이스** — PR 42가 올라오면 pr-42 네임스페이스가 생성된다. Web Deployment, API Deployment, Service, Ingress 전부 이 안에 들어간다. 다른 PR의 리소스와 섞이지 않는다.

**데이터베이스 스키마** — PR마다 PostgreSQL 인스턴스를 따로 띄우면 리소스 낭비가 심하다. 대신 하나의 인스턴스를 공유하되, PR마다 별도 스키마를 생성한다. ArgoCD PreSync Hook으로 Migration Job이 실행되면서 테이블을 초기화한다. 인스턴스 하나로 수십 개 PR의 데이터를 격리할 수 있다.

**Ingress 호스트** — PR별 도메인 형태로 접근한다. nip.io를 활용하면 DNS 레코드 없이 IP 기반으로 바로 접근 가능하다.

이 세 가지를 Kustomize overlay로 관리한다. base 매니페스트는 공통으로 쓰고, PR별 변수(네임스페이스, DB 스키마, Ingress 호스트)만 patch로 오버라이드한다. Git Tag 기반으로 ArgoCD가 특정 리비전을 참조한다.

```text
manifests/
  apps/
    base/
      api/                  # API Deployment, Service, Migration Job
      web/                  # Web Deployment, Service
      ingress.yaml
      sealed-secret.yaml
      serviceaccount.yaml
    kustomization.yaml
  overlays/
    pr/
      cleanup-job.yaml      # PreDelete Hook (DB schema DROP)
      kustomization.yaml
```

base는 공통이고 PR 번호, 스키마, 호스트만 patch로 주입한다. PR이 10개 열려도 매니페스트를 10벌 작성할 필요가 없다.

## Alpine과 Debian을 가르는 빌드 전략

같은 모노레포의 두 앱인데 Docker 빌드 전략이 다르다.

### Web — Next.js Standalone

Next.js의 standalone 모드는 서버 코드와 필요한 node_modules를 하나의 디렉토리로 번들링한다. 모노레포에서는 outputFileTracingRoot를 레포 루트로 설정해야 한다. 이걸 빠뜨리면 빌드는 성공하는데 런타임에 모듈을 찾지 못하는 함정이 있다. 루트와 앱의 node_modules를 Docker 내에서 병합하는 과정도 필요하다.

Base image는 node:20-alpine이다. 순수 JavaScript만 실행하므로 경량 이미지로 충분하다.

### API — NestJS와 pnpm deploy

API는 pnpm deploy로 프로덕션 의존성만 깔끔하게 추출한다. 빌드 결과물에 포함되지 않는 설정 파일과 DB migration 파일은 별도로 Docker context에 복사한다.

문제는 PDF 처리 기능이었다. canvas 네이티브 모듈이 glibc를 요구하는데, Alpine은 musl libc라 호환이 안 된다. API의 base image를 node:20-slim(Debian 기반)으로 바꿨다. 이미지 크기는 커졌지만 네이티브 모듈 호환성은 타협할 수 없다.

DB migration은 Pod 안에서 실행하지 않는다. Kubernetes PreSync Job으로 배포 직전에 실행된다. 앱 시작과 스키마 변경이 분리되어 있어서 롤백이 깔끔하다.

## ArgoCD와 Kustomize로 GitOps 배포

GitHub Actions와 ArgoCD의 역할이 명확하게 나뉜다.

GitHub Actions는 이미지를 빌드해서 ACR에 올린다. 그리고 argocd app set 명령에 kustomize-image 옵션을 주어 ArgoCD Application의 이미지 태그만 변경한다. ArgoCD가 diff를 감지하고 자동으로 sync한다. 매니페스트 YAML 파일을 직접 수정하지 않는다.

main push 시 Sandbox 배포도 같은 방식이다. Web과 API를 병렬로 빌드하고, ArgoCD에 이미지 태그를 넘기고, sync가 완료될 때까지 기다린다. Ingress host는 별도 patch를 적용한 후 재동기화한다.

시크릿은 SealedSecrets로 관리한다. 공개키로 암호화한 시크릿을 Git에 커밋하고, 클러스터의 SealedSecret 컨트롤러가 복호화한다. cluster-wide scope로 설정해서 PR별 네임스페이스에서도 같은 시크릿을 사용할 수 있다. 시크릿이 Git에 들어가니까 GitOps 원칙을 깨지 않는다.

## Cleanup — 만드는 것보다 어려운 것

Preview 환경을 만들기만 하고 정리하지 않으면 클러스터가 PR의 잔해로 뒤덮인다. 방치된 네임스페이스, 쌓이는 DB 스키마, 불어나는 컨테이너 이미지.

PR이 닫히면 cleanup-preview.yml이 다섯 가지를 순서대로 정리한다.

1. **Git Tags** — PR 관련 태그를 삭제한다. ArgoCD가 이 태그로 리비전을 참조하므로 먼저 정리해야 한다.
2. **ArgoCD Application** — cascade 옵션으로 삭제하면 Application이 관리하던 Deployment, Service, Pod가 연쇄적으로 정리된다.
3. **Kubernetes Namespace** — 네임스페이스를 삭제하면 안의 모든 리소스가 함께 사라진다.
4. **DB Schema** — PreDelete Hook Job이 DROP SCHEMA CASCADE를 실행한다. Application이 삭제되기 직전에 동작하므로 데이터가 남지 않는다.
5. **컨테이너 이미지** — ACR의 retention policy가 일정 기간 후 자동 정리한다. 별도 처리가 불필요하다.

PR이 오래 열려 있다가 닫혀도, 며칠 전 머지된 PR이 닫혀도 동일한 정리 프로세스가 동작한다.

## 설계 결정 요약

| 결정 | 선택 | 이유 |
|------|------|------|
| 변경 감지 | dorny/paths-filter + Nx affected | 2단 필터링으로 불필요한 빌드 방지 |
| PR 동시성 | concurrency + cancel-in-progress | 연속 push 시 이전 CI 자동 취소 |
| Preview DB | PostgreSQL schema isolation | DB 인스턴스 공유하면서 PR별 격리 |
| 시크릿 | SealedSecrets cluster-wide | Git에 암호화 저장, GitOps 원칙 유지 |
| 이미지 레지스트리 | Azure ACR | AKS와 같은 리전, 네트워크 비용 없음 |
| 배포 | ArgoCD + Kustomize | overlay 기반 환경별 설정, 자동 sync |
| Web base image | node:20-alpine | JavaScript만 실행, 경량 |
| API base image | node:20-slim | canvas glibc 의존성, Debian 필수 |

## 돌아보며

이 파이프라인이 완벽하지는 않다.

Smoke Test는 아직 빈 칸이다. Preview 환경이 뜨는 것까지는 자동이지만, 로그인이 되는지 API가 200을 반환하는지 자동으로 검증하지 못한다. Playwright로 E2E 테스트를 붙이는 게 다음 과제다.

SealedSecrets는 키 로테이션 시 모든 시크릿을 재암호화해야 한다. 지금은 시크릿 수가 적어서 수동으로 가능하지만, 규모가 커지면 자동화 스크립트가 필요할 것이다.

그래도 가장 큰 변화는 명확하다. 리뷰어가 "로컬에서 띄워봐야 할 것 같아요"라고 말하는 대신, PR에 자동으로 달리는 Preview URL을 클릭한다. 코드를 읽으면서 동작을 직접 확인하고, 머지하면 Sandbox에 반영된다. 사람이 개입하는 건 코드를 작성하고 리뷰를 승인하는 것뿐이다.

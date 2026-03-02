---
title: "블로그를 시작합니다"
description: "Astro + K3s + Cloudflare Tunnel 기반 기술 블로그 인프라 소개"
pubDate: 2026-03-02
tags: ["blog", "astro", "kubernetes", "infrastructure"]
---

## 블로그를 시작합니다

개인 기술 블로그를 시작합니다. Obsidian Vault에 쌓아둔 기술 노트를 블로그로 변환하여 공유하려 합니다.

## 기술 스택

이 블로그는 다음 스택으로 운영됩니다:

- **Astro** - 정적 사이트 생성기. Content Collections로 마크다운 관리
- **Tailwind CSS v4** - OKLCH 색상 체계 + 다크모드
- **GitHub Actions** - main 브랜치 push 시 자동 빌드 → gh-pages 배포
- **K3s (OrbStack)** - nginx + git-sync sidecar로 정적 파일 서빙
- **Cloudflare Tunnel** - `blog.neocode24.com`으로 외부 노출

## 아키텍처

```
Obsidian Vault
    ↓ (NanoClaw 변환)
GitHub Repository (main)
    ↓ (GitHub Actions)
gh-pages 브랜치
    ↓ (git-sync, 60초 주기)
K3s Pod (nginx)
    ↓ (Cloudflare Tunnel)
blog.neocode24.com
```

## 콘텐츠 파이프라인

1. Obsidian Vault에서 기술 노트 작성
2. NanoClaw가 공개 대상 노트를 블로그 포맷으로 변환
3. portfolio repo에 자동 커밋 + push
4. GitHub Actions가 Astro 빌드 후 gh-pages 배포
5. K3s의 git-sync가 60초마다 변경사항 pull
6. nginx가 정적 파일 서빙

기존 LiteLLM Gateway, NanoClaw와 동일한 인프라 패턴(OrbStack K3s + Cloudflare Tunnel)을 재사용하여 운영 비용 없이 블로그를 호스팅합니다.

## 앞으로

Kubernetes, DevOps, AI 인프라 관련 글을 올리겠습니다.

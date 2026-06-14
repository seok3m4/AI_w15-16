# Concepts Overview

이 디렉터리는 코드 작성과 운영 설계에 적용한 주요 개념과 패턴을 정리하는 공간입니다. 작업 로그가 "무엇을 바꿨는지"를 기록한다면, 개념 문서는 "왜 이런 구조를 썼는지"와 "어떻게 검증하거나 운영하는지"를 설명합니다.

## 작성 기준

중요한 코드 작성, 배포 자동화, 보안 설정, 백엔드/프론트엔드 통합처럼 다른 팀원이 다시 이해해야 하는 결정이 있으면 개념 문서를 추가하거나 갱신합니다.

개념 문서에는 다음 내용을 포함합니다.

- 적용된 개념 또는 패턴
- 이 프로젝트에서 그 개념을 사용한 이유
- 관련 파일
- 검증하거나 동작을 관찰하는 방법
- 흔한 실수와 후속 개선점

## 현재 개념 문서

- `security-filter-chain.md`
  - Spring Security 웹 페이지용 체인과 API용 체인 분리
- `swagger-openapi.md`
  - Springdoc OpenAPI와 Swagger UI 구성
- `iam-tag-based-sandbox-policies.md`
  - AWS IAM 태그 기반 샌드박스 정책 설계
- `iam-cost-bomb-guardrail-policies.md`
  - 비용 폭탄 방지를 위한 완화형 IAM guardrail 설계
- `cicd-ecs-deployment.md`
  - GitHub Actions, OIDC, ECR, ECS 배포 흐름
- `board-rag-postgresql.md`
  - 게시판 CRUD, PostgreSQL/RDS 전환, pgvector 기반 RAG schema 설계
- `dashboard-board-ui.md`
  - README `img.png` 기준의 흑백 대시보드형 게시판 UI 패턴
- `us-economy-ai-dashboard-contract.md`
  - 미국경제 AI 대시보드 MVP의 구조화된 샘플 데이터, API 계약, 첫 화면 렌더링 경로
- `python-agent-workbench.md`
  - Python Agents SDK worker, Spring Agent API, Agent 탭 워크벤치 통합 패턴
- `browser-synced-theme.md`
  - 브라우저 색상 설정을 따르는 시스템/라이트/다크 전역 테마 패턴
- `frontend-i18n.md`
  - 한국어/영어/중국어 간체/중국어 번체/일본어를 지원하는 프론트 전역 i18n Provider 패턴
- `server-locale-i18n.md`
  - 서버 locale 응답 기반 경제 대시보드/Agent 동적 콘텐츠 다국어 계약과 compact 표시 설정 패턴
- `economic-discussion-feed.md`
  - 경제 토론 피드의 카테고리, 닉네임, 좋아요, 대댓글, 신고, soft hide, 인앱 알림 패턴
- `home-economy-history-tabs.md`
  - 홈 탭 재구성, FRED 히스토리 캐시, 원천기관 비교값 API와 확장 그래프 UI 패턴

## 문서 템플릿

```markdown
# Concept Name

## Where It Appears

- `path/to/file`

## What Was Applied

- Explain the core concept in project-specific terms.

## Why It Matters

- Explain why this implementation uses the concept.

## Verification

- `command`: outcome

## Pitfalls And Follow-Ups

- Note risks, limitations, or next steps.
```

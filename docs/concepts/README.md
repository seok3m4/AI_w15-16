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

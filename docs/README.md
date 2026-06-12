# Docs Overview

이 디렉터리는 프로젝트 설계, 작업 로그, 개념 설명, 배포 운영 문서를 모아두는 공간입니다. 프롬프트 원문은 사용자가 명확히 저장을 승인한 경우에만 `docs/prompt-history/`에 저장합니다.

## 문서 구조

```text
docs/
+-- README.md
+-- ecs-deployment-testing-guide.md
+-- prompt-workflow-hook.md
+-- concepts/
|   +-- README.md
|   +-- cicd-ecs-deployment.md
|   +-- iam-cost-bomb-guardrail-policies.md
|   +-- iam-tag-based-sandbox-policies.md
|   +-- security-filter-chain.md
|   +-- swagger-openapi.md
+-- prompt-history/
|   +-- 2026-06-05.md
|   +-- 2026-06-07.md
+-- work-logs/
|   +-- 2026-06-05-backend-frontend-integration.md
|   +-- 2026-06-11-documentation-cicd-ecs.md
+-- superpowers/
    +-- plans/
    +-- specs/
```

## 주요 문서

### 프로젝트 작업 로그

- `docs/work-logs/2026-06-05-backend-frontend-integration.md`
  - Spring Boot 백엔드와 Ionic React 프론트엔드 연동 작업 기록
  - `/api/status`, `/api/me` API 계약
  - Vite proxy와 프론트엔드 호출 경로
  - 백엔드 테스트, 프론트엔드 lint/build 검증 결과
- `docs/work-logs/2026-06-11-documentation-cicd-ecs.md`
  - README 정비와 CI/CD, ECS 배포 운영 문서화 작업 기록
  - deploy workflow의 ECR push, task definition render, ECS service update 흐름 정리
  - 문서 검증 명령과 결과 기록

### ECS 배포와 테스트

- `docs/ecs-deployment-testing-guide.md`
  - ECS 서비스가 실행 중인 상태에서 서버 업데이트 후 배포가 진행되는 순서
  - 현재 저장소의 ECR push, task definition render, ECS service update 자동화
  - ALB 주소로 사용자가 접속해 smoke test하는 방법
  - 장애 상황별 확인 지점

### 개념 문서

- `docs/concepts/security-filter-chain.md`
  - Spring Security 웹 페이지용 체인과 API용 체인 분리
- `docs/concepts/swagger-openapi.md`
  - Springdoc OpenAPI와 Swagger UI 구성
- `docs/concepts/iam-tag-based-sandbox-policies.md`
  - 태그 기반 AWS 샌드박스 정책 설계
- `docs/concepts/iam-cost-bomb-guardrail-policies.md`
  - 비용 폭탄 방지를 위한 완화형 IAM guardrail 설계
- `docs/concepts/cicd-ecs-deployment.md`
  - GitHub Actions, OIDC, ECR, ECS 배포 흐름

### 자동화와 프롬프트 기록 규칙

- `docs/prompt-workflow-hook.md`
  - 프롬프트 원문 저장 전 사용자 동의를 받는 프로젝트 규칙
  - Codex hook으로 확장할 때의 예시와 한계
- `docs/prompt-history/`
  - 사용자가 저장을 승인한 프롬프트 원문과 작업 요약만 저장

### 계획 문서

- `docs/superpowers/specs/2026-06-05-front-ionic-react-capacitor-design.md`
  - Ionic React + Capacitor 프론트엔드 초기 설계
- `docs/superpowers/plans/2026-06-05-front-ionic-react-capacitor.md`
  - 프론트엔드 초기 구현 계획

## 문서 작성 원칙

- 프롬프트 원문은 사용자 동의 없이 저장하지 않는다.
- 작업 요약과 기술 설명은 프롬프트 원문 없이 작성할 수 있다.
- 구현 작업은 `docs/work-logs/`에 변경 파일, 의사결정, 검증 결과를 남긴다.
- 중요한 코드나 운영 패턴은 `docs/concepts/`에 개념 문서로 분리한다.
- 배포나 백엔드/프론트엔드 통합 문서는 API 계약, 호출 경로, 실행 명령, 검증 결과를 함께 기록한다.

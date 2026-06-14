# AI_w15-16

AI 적용 기술을 활용한 게시판 서비스 과제 저장소입니다. 현재는 Spring Boot 백엔드와 Ionic React 프론트엔드의 기본 구조, 백엔드 API 연동, Swagger 문서, GitHub Actions 기반 CI/CD 자동화, AWS ECS 배포 설계까지 정리되어 있습니다.

![프로젝트 개요](img.png)

## 프로젝트 개요

- 기본 게시판 서비스에 AI 기능을 단계적으로 결합하는 것을 목표로 합니다.
- 백엔드는 Spring Boot 기반 로그인 화면, 보안 설정, JSON API, Swagger UI를 제공합니다.
- 프론트엔드는 React, TypeScript, Vite, Ionic React, Capacitor 기반으로 구성했습니다.
- 배포 자동화는 GitHub Actions, GitHub OIDC, Amazon ECR, Amazon ECS Fargate를 기준으로 설계했습니다.
- 과제 요구사항, 회의 기록, 작업 로그, 개념 문서는 `docs/`와 `myself/` 아래에 관리합니다.

## 기술 스택

### Backend

- Java 21
- Spring Boot 4
- Spring Security
- Thymeleaf
- Springdoc OpenAPI
- Maven
- Docker

### Frontend

- React 18
- TypeScript
- Vite
- Ionic React
- Capacitor
- ESLint

### Automation And AWS

- GitHub Actions
- GitHub Projects 자동화
- Slack webhook 알림
- GitHub OIDC 기반 AWS 인증
- Amazon ECR
- Amazon ECS Fargate
- Application Load Balancer 기반 접속 구조
- CloudWatch Logs 기반 운영 로그 구조

## 디렉터리 구조

```text
.
+-- .github/workflows/              # CI, ECR 이미지 푸시, AWS OIDC 검증, 프로젝트 자동화
+-- backend/                        # Spring Boot 백엔드
|   +-- src/main/java/               # 애플리케이션, 보안 설정, API/페이지 컨트롤러
|   +-- src/main/resources/          # Thymeleaf 템플릿, 정적 CSS, 설정 파일
|   +-- src/test/java/               # 백엔드 기본/보안/API 테스트
|   +-- Dockerfile                   # 백엔드 컨테이너 이미지 빌드
+-- front/                          # Ionic React + Vite 프론트엔드
|   +-- src/api/                     # 백엔드 API 호출 모듈
|   +-- src/app/                     # Ionic 앱 셸과 라우터
|   +-- src/pages/                   # 초기 홈 화면
|   +-- src/theme/                   # Ionic 테마 파일
+-- docs/                           # 설계, 작업 로그, 개념, 배포 운영 문서
+-- myself/                         # 회의록과 개인 정리 노트
+-- common/workflows/               # 대화형 작업 트리거 문서
+-- 과제내용.md                     # 과제 요구사항 정리
+-- README.md
```

## 현재 구현 내용

### Backend

- 커스텀 로그인 페이지(`/login`)와 인증 후 프론트 게시판 화면 이동을 제공합니다.
- 로그인 성공 후 이동할 프론트 URL은 `FRONTEND_BOARD_URL` 환경 변수로 변경할 수 있으며 기본값은 `http://localhost:5173/home`입니다.
- 테스트용 인메모리 계정을 사용합니다.
- Spring Security 보안 체인을 웹 페이지용과 API용으로 분리했습니다.
- `/api/status`는 공개 상태 확인 API입니다.
- `/api/me`는 인증된 사용자 이름을 반환합니다.
- API 인증 실패는 HTML 로그인 리다이렉트가 아니라 `401 Unauthorized`로 응답합니다.
- Swagger UI(`/swagger-ui.html`)와 OpenAPI JSON(`/v3/api-docs`)을 제공합니다.

테스트 계정:

```text
ID: user
PW: password
```

### Frontend

- Vite 기반 React TypeScript 프로젝트를 구성했습니다.
- Ionic React 앱 셸, 라우터, 홈 화면, 테마 파일을 추가했습니다.
- `front/src/api/backend.ts`에서 백엔드 API 호출을 모듈화했습니다.
- 개발 서버에서 `/api/*` 요청은 Vite proxy를 통해 `http://localhost:8080`으로 전달됩니다.
- 홈 화면은 백엔드 연결 상태와 인증 상태를 표시하고, 인증이 없으면 백엔드 로그인 화면으로 이동할 수 있게 구성했습니다.
- Capacitor 설정과 `cap:sync`, `cap:copy` 스크립트를 준비했습니다.

### Documentation

- `docs/work-logs/`에는 실제 수행 작업, 변경 파일, 검증 결과를 기록합니다.
- `docs/concepts/`에는 보안 체인, Swagger, AWS IAM, CI/CD 배포 패턴 같은 주요 개념을 정리합니다.
- `docs/prompt-history/`는 사용자가 프롬프트 원문 저장을 명확히 승인한 경우에만 사용합니다.
- `docs/ecs-deployment-testing-guide.md`에는 ECS 실행 상태에서 서버 업데이트가 배포되는 흐름과 테스트 방법을 별도로 정리했습니다.

## 로컬 실행 방법

### Backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

브라우저 접속:

```text
http://localhost:8080
http://localhost:8080/swagger-ui.html
http://localhost:8080/api/status
```

### Frontend

```powershell
cd front
npm install
npm run dev
```

기본 Vite 개발 서버 주소:

```text
http://localhost:5173
```

## AI Agent 환경 변수 준비

Agent 기능을 붙일 때는 루트 `.env.agents.example`을 기준으로 로컬은 `.env.agents.local`, 배포는 GitHub Secrets/ECS/Secrets Manager에 같은 키를 등록합니다. 실제 값은 커밋하지 않습니다.

사람이 직접 입력할 값은 `OPENAI_API_KEY`, `OPENAI_AGENT_MODEL`, 그리고 실데이터 연결 시 `BLS_API_KEY`, `FRED_API_KEY`, `NEWS_SEARCH_API_KEY`입니다. Agent 관련 키가 늘어나면 `.env.agents.example`과 이 짧은 절차를 함께 갱신합니다.

## 검증 명령

### Backend

```powershell
cd backend
.\mvnw.cmd test
```

### Frontend

```powershell
cd front
npm run lint
npm run build
```

### Git Ignore 확인

로컬 Maven 저장소 캐시가 Git에 올라가지 않도록 루트 `.gitignore`에 `.m2/`, `**/.m2/` 패턴을 추가했습니다.

```powershell
git check-ignore -v backend/.m2/repository/ch/qos/logback/logback-classic/1.5.32/logback-classic-1.5.32.jar
```

## CI/CD 자동화

현재 자동화는 `gyugo` 브랜치를 기준으로 동작합니다.

### CI: `.github/workflows/ci.yml`

- 트리거: `gyugo` 브랜치 push, `gyugo` 대상 pull request
- 백엔드: Java 21 설정 후 `./mvnw test` 실행
- 프론트엔드: Node 20 설정, `npm ci`, `npm run build` 실행

### Backend ECS Deploy: `.github/workflows/deploy.yml`

- 트리거: `gyugo` 브랜치 push, 수동 `workflow_dispatch`
- GitHub OIDC로 AWS 역할을 Assume합니다.
- Amazon ECR에 로그인합니다.
- `backend/Dockerfile`로 백엔드 이미지를 빌드합니다.
- 이미지를 `489535778783.dkr.ecr.ap-northeast-2.amazonaws.com/nammanmu/gyugo/backend:${GITHUB_SHA}` 태그로 푸시합니다.
- 현재 ECS task definition을 내려받습니다.
- 새 이미지 URI를 task definition의 `backend` 컨테이너에 반영합니다.
- ECS 서비스 `nammanmu-gyugo-backend`를 클러스터 `nammanmu-dev`에서 새 task definition으로 배포합니다.
- `wait-for-service-stability: true`로 ECS 서비스 안정화까지 대기합니다.
- `HEALTH_CHECK_URL` 값이 있으면 curl 기반 smoke test를 실행하고, 비어 있으면 smoke test를 건너뜁니다.

### AWS Role Check: `.github/workflows/aws-role.yml`

- 트리거: `gyugo` 브랜치 push, 수동 `workflow_dispatch`
- GitHub OIDC 역할 인증이 정상인지 `aws sts get-caller-identity`로 확인합니다.

### Project Automation: `.github/workflows/automation.yml`

- 이슈 생성 시 Slack 알림을 보냅니다.
- 이슈 할당 시 GitHub Project 상태를 `In Progress`로 이동합니다.
- PR 생성 시 Slack 알림을 보냅니다.
- PR merge 또는 이슈 close 시 GitHub Project 상태를 `Done`으로 이동합니다.
- 필요한 시크릿: `SLACK_WEBHOOK_URL`, `PROJECT_TOKEN`

## AWS 배포 구조 요약

배포 설계는 `nammanmu-relaxed-cicd-aws-architecture.drawio`에 정리되어 있습니다.

- GitHub Actions가 OIDC로 AWS 배포 역할을 Assume합니다.
- 백엔드 Docker 이미지는 ECR 저장소 `nammanmu/gyugo/backend`에 저장됩니다.
- ECS Fargate 서비스는 ECR 이미지를 pull해 컨테이너를 실행합니다.
- Application Load Balancer가 외부 HTTP/HTTPS 요청을 ECS task target group으로 전달합니다.
- CloudWatch Logs가 ECS task 로그를 수집합니다.
- 비용 폭탄 방지를 위해 IAM guardrail, Budgets, 태그 기반 비용 추적 설계를 함께 문서화했습니다.

ECS 실행 중 서버 업데이트 후 자동 배포와 사용자 테스트 방법은 [ECS Deployment And Testing Guide](docs/ecs-deployment-testing-guide.md)를 참고하세요.

## 관련 문서

- [Docs Overview](docs/README.md)
- [ECS Deployment And Testing Guide](docs/ecs-deployment-testing-guide.md)
- [Documentation CI/CD ECS Work Log](docs/work-logs/2026-06-11-documentation-cicd-ecs.md)
- [Backend Frontend Integration Work Log](docs/work-logs/2026-06-05-backend-frontend-integration.md)
- [CI/CD ECS Deployment Concept](docs/concepts/cicd-ecs-deployment.md)
- [IAM Cost-Bomb Guardrail Policies](docs/concepts/iam-cost-bomb-guardrail-policies.md)
- [IAM Tag-Based Sandbox Policies](docs/concepts/iam-tag-based-sandbox-policies.md)
- [Prompt Workflow Hook](docs/prompt-workflow-hook.md)

## 앞으로의 작업

- 운영용 ALB DNS가 확정되면 `HEALTH_CHECK_URL`에 `/api/status` 같은 확인 URL을 설정합니다.
- ECS cluster/service/task definition/container 이름이 변경되면 `deploy.yml`과 문서 값을 함께 갱신합니다.
- 운영용 인증 저장소를 추가합니다.
- RAG embedding 생성, chunking job, semantic search API를 구현합니다.
- MCP, AI Agent 기능의 상세 설계를 추가합니다.

## 게시판, PostgreSQL, RAG 구성

- 게시글 CRUD, 댓글 작성/수정/삭제, 태그 필터, 키워드 검색 API를 추가했습니다.
- 프론트엔드 홈 화면은 검색, 태그 필터, 목록, 상세, 작성/수정, 댓글을 한 화면에서 다루는 게시판 작업 화면으로 바뀌었습니다.
- PostgreSQL datasource는 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` 환경 변수로 설정합니다.
- 로컬 PostgreSQL에서 RDS PostgreSQL로 전환할 때는 datasource endpoint와 자격 증명만 바꾸는 구조입니다.
- Flyway migration `V1__create_board_and_rag_schema.sql`에 게시판 테이블과 RAG 확장용 `rag_documents`, `rag_chunks`, `rag_index_jobs` 테이블을 포함했습니다.
- `rag_chunks.embedding`은 `pgvector`의 `vector(1536)` 타입을 기준으로 설계했습니다.
- 학습용 정리는 `study/postgresql-rds-rag.md`, `study/board-crud-api.md`에 있습니다.

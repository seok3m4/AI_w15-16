# AI가 읽는 미국경제 대시보드 - Notion 발표용 전체 기술 정리

작성일: 2026-06-13

## 1. 발표 한 줄 요약

이 프로젝트는 미국 경제 지표를 수집하고, 출처가 있는 데이터만 AI가 요약하도록 만든 대시보드형 게시판 서비스입니다.  
프론트엔드는 Ionic React 기반 웹 앱이고, 백엔드는 Spring Boot 기반 REST API이며, 데이터는 PostgreSQL/Flyway로 관리하고, RAG/AI Agent 기능은 OpenAI API, OpenAI Agents SDK, MCP, FastAPI worker로 확장했습니다.

## 2. 전체 구조

```text
사용자 브라우저
  -> Ionic React + TypeScript + Vite 프론트엔드
  -> /api 요청
  -> Spring Boot REST API
  -> PostgreSQL + Flyway + JPA + JdbcTemplate
  -> 경제 지표 캐시, 게시판, 사용자, Agent 실행 기록, RAG 인덱스 저장
  -> FRED/BLS/BEA/Alpha Vantage/GDELT/OpenAI 연동
  -> FastAPI Agent Worker + OpenAI Agents SDK + MCP tools
  -> GitHub Actions + AWS OIDC + ECR/ECS/S3/CloudFront 배포 자동화
```

발표 핵심은 "단순 게시판"이 아니라 "경제 데이터, 검증 가능한 AI 요약, 사용자 커뮤니티, RAG 검색, 배포 자동화"가 연결된 풀스택 구조라는 점입니다.

## 3. 기술 스택 요약표

| 영역 | 사용 기술 | 프로젝트에서 맡은 역할 | 대표 파일 |
|---|---|---|---|
| Frontend | React 18 | 대시보드, 게시판, Agent 워크벤치 화면 구성 | `front/src/pages/HomePage.tsx` |
| Frontend | TypeScript | API 응답 타입, 화면 상태 타입 안정성 확보 | `front/src/api/*.ts` |
| Frontend | Vite | 개발 서버, 빌드, `/api` 프록시 | `front/vite.config.ts` |
| Frontend | Ionic React | 모바일 친화적인 앱 셸과 UI 컴포넌트 | `front/src/app/App.tsx` |
| Frontend | Capacitor | 향후 모바일 앱 패키징 준비 | `front/capacitor.config.ts` |
| Frontend | Ionicons | 버튼/상태/내비게이션 아이콘 | `front/src/pages/*.tsx` |
| Frontend | React Router DOM v5 | `/home`, `/my` 등 라우팅 | `front/src/app/App.tsx` |
| Frontend | CSS Grid/Flexbox | 대시보드형 정보 배치와 반응형 레이아웃 | `front/src/pages/HomePage.css` |
| Frontend | i18n 직접 구현 | 한국어, 영어, 중국어 간체/번체, 일본어 지원 | `front/src/i18n/i18n.ts` |
| Frontend | Theme Provider | system/light/dark 테마 전환 | `front/src/theme/ThemeProvider.tsx` |
| Backend | Java 21 | Spring Boot 백엔드 실행 언어 | `backend/pom.xml` |
| Backend | Spring Boot 4.0.6 | 백엔드 애플리케이션 프레임워크 | `backend/pom.xml` |
| Backend | Spring WebMVC | REST API와 서버 페이지 컨트롤러 | `backend/src/main/java/.../controller` |
| Backend | Spring Security | API/웹 보안 체인 분리, 로그인, 인증 | `backend/src/main/java/.../config/SecurityConfig.java` |
| Backend | OAuth2 Client | Google OAuth 로그인 | `backend/src/main/java/.../user/PersistingOAuth2UserService.java` |
| Backend | Thymeleaf | 백엔드 로그인 페이지 렌더링 | `backend/src/main/resources/templates/login.html` |
| Backend | Spring Data JPA | 게시판 엔티티와 관계형 데이터 모델 | `backend/src/main/java/.../board` |
| Backend | JdbcTemplate | RAG, Agent 내부 도구, 복잡한 SQL 처리 | `backend/src/main/java/.../rag/RagIndexService.java` |
| Backend | RestClient | FRED, OpenAI, BLS, BEA, Alpha Vantage API 호출 | `backend/src/main/java/.../economy` |
| Backend | Spring Scheduling | 경제 데이터 주기 동기화 | `EconomySyncService.java` |
| Backend | Springdoc OpenAPI | Swagger UI, OpenAPI JSON 문서화 | `backend/src/main/java/.../config/OpenApiConfig.java` |
| Database | PostgreSQL | 운영 기준 DB | `backend/src/main/resources/application.properties` |
| Database | Flyway | DB 스키마 버전 관리 | `backend/src/main/resources/db/migration` |
| Database | pgvector | RAG 임베딩 저장을 위한 vector 타입 | `V1__create_board_and_rag_schema.sql` |
| Database | H2 | 백엔드 테스트용 인메모리 DB | `backend/src/main/resources/application-test.properties` |
| AI | OpenAI Responses API | 구조화된 경제 브리핑 생성 | `OpenAiBriefService.java` |
| AI | OpenAI Embeddings API | 게시글/RAG 청크 임베딩 생성 | `OpenAiEmbeddingService.java` |
| AI | OpenAI Agents SDK | Agent worker의 브리핑/채팅 실행 | `agent-worker/app/service.py` |
| AI | MCP | Agent가 사용할 경제 지표/RAG/뉴스 도구 프로토콜 | `agent-worker/app/mcp_server.py` |
| AI | FastAPI | Python Agent Worker HTTP API | `agent-worker/app/main.py` |
| AI | Pydantic v2 | Agent 요청/응답 스키마 검증 | `agent-worker/app/schemas.py` |
| Data | FRED API | 경제 지표 최신값/히스토리 수집 | `FredSeriesClient.java` |
| Data | BLS API | CPI/고용 등 source comparison 수집 | `EconomySourceComparisonSyncService.java` |
| Data | BEA API | GDP/PCE 등 source comparison, 발표 일정 수집 | `EconomySourceComparisonSyncService.java` |
| Data | Alpha Vantage API | 환율, 금리, 주식, 원유 보조 데이터 | `EconomySourceComparisonSyncService.java` |
| Data | GDELT Doc API | Agent 관련 뉴스 검색 도구 | `agent-worker/app/mcp_tools.py` |
| DevOps | Docker | 백엔드 컨테이너 이미지 빌드 | `backend/Dockerfile` |
| DevOps | GitHub Actions | CI, 백엔드/프론트 배포, 프로젝트 자동화 | `.github/workflows/*.yml` |
| DevOps | GitHub OIDC | AWS 배포 역할 Assume, 장기 키 최소화 | `.github/workflows/deploy-backend.yml` |
| DevOps | Amazon ECR | 백엔드 Docker 이미지 저장소 | `.github/workflows/deploy-backend.yml` |
| DevOps | Amazon ECS Fargate | 백엔드 컨테이너 실행 대상 | `.github/workflows/deploy-backend.yml` |
| DevOps | Amazon S3 | 프론트 정적 파일 배포 대상 | `.github/workflows/deploy-frontend.yml` |
| DevOps | CloudFront | 프론트 CDN 캐시와 배포 | `.github/workflows/deploy-frontend.yml` |
| DevOps | Slack Webhook | 이슈/PR 알림 자동화 | `.github/workflows/automation.yml` |
| DevOps | GitHub Projects GraphQL | 이슈/PR 상태 자동 이동 | `.github/workflows/automation.yml` |
| Docs | Markdown | 작업 로그, 개념 노트, 학습 문서 | `docs/`, `study/` |
| Docs | draw.io | AWS/CI-CD 아키텍처 다이어그램 | `*.drawio` |

## 4. 프론트엔드 기술 상세

### React 18

- 대시보드, 게시판, 마이페이지, Agent 워크벤치를 컴포넌트 단위로 구성합니다.
- `useState`, `useEffect`, `useMemo`, `useCallback`을 사용해 API 로딩, 필터링, 선택 상태, 히스토리 차트 상태를 관리합니다.
- 대표 화면:
  - `HomePage.tsx`: 미국경제 대시보드 중심 화면
  - `DiscussionBoard.tsx`: 게시판/댓글/태그/신고/알림 화면
  - `AgentWorkbench.tsx`: Agent 브리핑과 채팅 화면
  - `MyPage.tsx`: 사용자 프로필과 대시보드 선호 설정

### TypeScript

- 경제 지표, 게시글, 댓글, Agent 실행 결과, 사용자 선호 설정을 interface/type으로 고정합니다.
- API 계약이 바뀌면 프론트 코드가 컴파일 단계에서 빠르게 깨지므로, 화면과 백엔드 계약을 안정적으로 맞출 수 있습니다.
- 대표 파일:
  - `front/src/api/economy.ts`
  - `front/src/api/posts.ts`
  - `front/src/api/agents.ts`
  - `front/src/api/backend.ts`

### Vite

- React 개발 서버와 production build를 담당합니다.
- `front/vite.config.ts`에서 `/api` 요청을 `http://localhost:8080`으로 프록시합니다.
- 루트 `.env.local`을 읽도록 `envDir: "../"`를 사용합니다.
- 운영 환경에서는 `VITE_API_BASE_URL`, `VITE_BACKEND_ORIGIN`으로 백엔드 주소를 바꿀 수 있습니다.

### Ionic React

- `IonApp`, `IonRouterOutlet`, `IonContent`, `IonPage`, `IonIcon` 등을 사용해 앱처럼 보이는 웹 UI를 구성합니다.
- 모바일 확장성을 고려한 선택입니다.
- 현재는 웹 중심이며, Capacitor의 Android/iOS 플랫폼 폴더는 아직 생성하지 않은 준비 단계입니다.

### Capacitor

- `appId: "camp.jungle.ai"`, `appName: "Jungle AI"`, `webDir: "dist"`로 설정되어 있습니다.
- Vite 빌드 결과물을 나중에 모바일 WebView 앱으로 감쌀 수 있는 기반입니다.

### i18n

- 지원 locale: `ko`, `en`, `zh-Hans`, `zh-Hant`, `ja`
- 브라우저 언어와 localStorage를 사용해 언어를 유지합니다.
- 프론트 API 호출에도 locale query를 붙여 백엔드가 같은 언어로 경제 지표/브리핑을 반환하게 합니다.

### 테마 시스템

- system/light/dark 모드를 제공합니다.
- `prefers-color-scheme`과 localStorage를 함께 사용합니다.
- `document.documentElement` 속성에 테마 값을 반영해 CSS에서 전역 스타일을 바꿉니다.

## 5. 백엔드 기술 상세

### Java 21 + Spring Boot 4

- Java 21과 Spring Boot 4.0.6을 사용합니다.
- record DTO를 적극적으로 사용해 API 응답 구조를 간결하게 표현합니다.
- 애플리케이션 진입점에서는 scheduling을 켜서 경제 데이터 동기화를 자동 실행합니다.

### Spring WebMVC REST API

주요 API 그룹은 다음과 같습니다.

| API 그룹 | 경로 | 역할 |
|---|---|---|
| 상태/인증 | `/api/status`, `/api/me`, `/api/logout` | 백엔드 상태와 현재 사용자 |
| 미국경제 대시보드 | `/api/us-economy/*` | 지표, 히스토리, 이벤트, 리포트 |
| 게시판 | `/api/posts`, `/api/tags`, `/api/board/notifications` | CRUD, 댓글, 좋아요, 신고, 알림 |
| Agent | `/api/agents/*` | Agent run, summary, chat, catalog |
| Agent 내부 도구 | `/api/internal/agent-tools/*` | MCP worker가 호출하는 read-only 도구 |

### Spring Security

- API용 보안 체인과 웹 페이지용 보안 체인을 분리했습니다.
- 공개 GET API와 인증 필요 API를 명확히 나눕니다.
- API 인증 실패는 HTML 로그인 리다이렉트가 아니라 `401 Unauthorized`로 응답합니다.
- 로그인 방식:
  - 폼 로그인: 개발/테스트용 `user/password`
  - Google OAuth2: 실제 사용자 계정 연동

### Google OAuth2 사용자 저장

- `PersistingOAuth2UserService`가 Google OAuth 사용자 정보를 읽어 `app_users`에 저장합니다.
- 사용자별 대시보드 선호 설정, 닉네임, 게시글 작성자 연결에 사용합니다.

### Thymeleaf

- 백엔드 로그인 화면을 서버 렌더링으로 제공합니다.
- 프론트에서 로그인 버튼을 누르면 백엔드 로그인 페이지로 이동하고, 성공 시 프론트 `/home`으로 돌아옵니다.

### Springdoc OpenAPI

- Swagger UI: `/swagger-ui.html`
- OpenAPI JSON: `/v3/api-docs`
- 발표 포인트: API 계약을 사람이 직접 확인할 수 있어 프론트/백엔드 협업이 쉬워집니다.

## 6. 데이터베이스와 RAG 구조

### PostgreSQL

- 운영 기준 DB입니다.
- datasource는 환경 변수로 교체합니다.

```properties
DB_URL
DB_USERNAME
DB_PASSWORD
```

로컬 PostgreSQL에서 AWS RDS PostgreSQL로 넘어갈 때 애플리케이션 코드를 바꾸지 않고 연결 정보만 바꾸는 구조입니다.

### Flyway

- 스키마 변경을 `V1__...sql`, `V2__...sql` 형태의 migration으로 관리합니다.
- 운영에서는 `spring.jpa.hibernate.ddl-auto=validate`를 사용하므로, 테이블 생성/변경은 Flyway가 담당합니다.

주요 migration:

| Migration | 내용 |
|---|---|
| `V1__create_board_and_rag_schema.sql` | 게시판, 댓글, 태그, RAG 문서/청크/job, pgvector |
| `V2__create_economy_cache_schema.sql` | 경제 지표 캐시, 이벤트, 브리핑, sync run |
| `V3__create_users_and_dashboard_preferences.sql` | 사용자와 대시보드 선호 설정 |
| `V4__create_agent_workbench_schema.sql` | Agent run, step, message |
| `V5__extend_agent_mcp_evidence_schema.sql` | Agent evidence item |
| `V6__add_agent_message_level_evidence.sql` | 메시지 단위 evidence 연결 |
| `V7__add_agent_run_soft_delete.sql` | Agent run soft delete |
| `V8__extend_board_community_features.sql` | 좋아요, 신고, 알림, 닉네임 |
| `V9__add_locale_to_economy_and_agent_runs.sql` | locale 저장 |
| `V10__add_economy_history_and_source_comparison.sql` | 지표 히스토리, source comparison |
| `V11`, `V12` | AI 토론 게시판 샘플 데이터와 RAG 샘플 |

### pgvector

- `CREATE EXTENSION IF NOT EXISTS vector;`
- `rag_chunks.embedding vector(1536)` 컬럼을 둡니다.
- OpenAI `text-embedding-3-small` 모델의 1536차원 벡터를 저장할 수 있게 설계했습니다.

현재 RAG 검색은 키워드 검색 중심으로 동작하고, embedding 저장은 준비되어 있습니다. 향후에는 pgvector similarity search를 붙이면 의미 기반 검색으로 확장할 수 있습니다.

### JPA와 JdbcTemplate 병행

- 게시글/댓글/태그처럼 관계가 명확한 도메인은 JPA Entity로 다룹니다.
- RAG 문서/청크, 내부 검색처럼 SQL 제어가 중요한 부분은 JdbcTemplate을 사용합니다.
- 발표 포인트: ORM과 SQL을 상황에 맞게 나눠 썼습니다.

## 7. 경제 데이터 수집 기술

### FRED API

- 실제 구현된 핵심 경제 지표 수집 API입니다.
- 최신값과 5년 히스토리를 가져옵니다.
- 주요 지표:
  - CPI
  - Core CPI
  - PCE
  - Unemployment
  - Nonfarm Payrolls
  - Retail Sales
  - Real GDP Growth
  - U.S. Treasury 10Y/2Y
  - USD/KRW
  - S&P 500
  - WTI

### BLS API

- CPI, Core CPI, 실업률, 고용 등 source comparison에 사용합니다.
- BLS 발표 일정은 ICS calendar로 수집합니다.

### BEA API

- GDP/PCE 관련 source comparison에 사용합니다.
- BEA release schedule도 수집합니다.

### Alpha Vantage API

- 환율, Treasury yield, S&P 500 proxy, WTI 등 보조 market source comparison에 사용합니다.

### GDELT Doc API

- Python Agent Worker의 MCP 도구에서 관련 뉴스 검색에 사용합니다.
- 뉴스 결과는 source URL과 함께 evidence item으로 정규화합니다.

## 8. AI 기술 상세

### OpenAI Responses API

- Spring 백엔드에서 `/v1/responses`를 호출합니다.
- `text.format`에 strict JSON schema를 주어 AI 브리핑 결과를 구조화합니다.
- 반환 구조:
  - `summary`
  - `statusLabel`
  - `koreaImpact`
  - `risks`
  - `evidenceMetricIds`
  - `evidenceEventIds`

발표 포인트: AI가 자유롭게 문장만 만드는 구조가 아니라, 화면이 바로 사용할 수 있는 JSON 계약으로 받습니다.

### Rule-based fallback

- OpenAI API key가 없거나 호출 실패 시 `RuleBasedBriefFactory`가 대체 브리핑을 만듭니다.
- 데모와 로컬 개발에서 AI API 장애가 있어도 화면이 완전히 멈추지 않도록 합니다.

### OpenAI Embeddings API

- `/v1/embeddings`를 호출해 게시글 내용을 vector literal로 변환합니다.
- 기본 embedding 모델 설정값: `text-embedding-3-small`
- 게시글 생성/수정 시 RAG 문서와 청크를 갱신하는 흐름에 연결됩니다.

### OpenAI Agents SDK

- Python worker에서 `Agent`, `Runner`, `function_tool`, `MCPServerStreamableHttp`를 사용합니다.
- Agent 종류:
  - Beginner Explainer Agent
  - Korea Impact Agent
  - Indicator Drilldown Agent
  - Evidence Checker Agent
- 설정 모델명은 환경 변수 `OPENAI_AGENT_MODEL`로 바꿀 수 있습니다.

### MCP

- FastAPI worker 안에서 MCP server를 만들고 `/mcp`로 mount합니다.
- MCP 도구:
  - `economic_indicator_search`
  - `latest_fred_snapshot`
  - `related_news_search`
  - `rag_search`
- Agent는 MCP 도구를 통해 백엔드의 검증된 지표, FRED snapshot, RAG 검색 결과, 관련 뉴스를 읽습니다.

### Evidence guardrails

- Agent 답변은 evidence id가 있어야 `answered` 상태가 됩니다.
- 출처 없는 metric/event/news/RAG chunk id는 guardrail에서 거절됩니다.
- 투자 조언을 하지 않고, 숫자를 지어내지 않도록 instruction과 검증 로직을 함께 둡니다.

## 9. Python Agent Worker

| 기술 | 역할 |
|---|---|
| FastAPI | `/agent/briefing`, `/agent/chat`, `/mcp` HTTP 엔드포인트 |
| Uvicorn | 로컬 worker 실행 서버 |
| Pydantic v2 | 요청/응답 타입 검증 |
| openai-agents | Agent 실행, tool, MCP 연결 |
| mcp | FastMCP server와 streamable HTTP |
| pytest | worker 테스트 |
| httpx | GDELT와 백엔드 내부 API 호출 코드에서 사용 |

주의할 점:

- `agent-worker/app/*.py`는 `httpx`를 직접 import합니다.
- 현재 `agent-worker/requirements.txt`에는 `httpx`가 직접 명시되어 있지 않으므로, 배포/재현성을 위해 명시 의존성으로 추가하는 것이 좋습니다.

## 10. 게시판과 커뮤니티 기능

### 게시글 CRUD

- 게시글 작성, 목록, 상세, 수정, 삭제를 제공합니다.
- 검색 조건:
  - keyword
  - tag
  - category
  - sort
  - page/size

### 댓글과 대댓글

- 댓글 작성/수정/삭제를 제공합니다.
- `parentCommentId`를 사용해 답글 구조를 지원합니다.

### 태그

- 게시글과 태그는 join table로 연결합니다.
- 태그 목록 API를 제공합니다.

### 좋아요, 신고, 알림

- 게시글 좋아요/좋아요 취소
- 게시글/댓글 신고
- 게시판 알림과 읽음 처리
- 사용자별 unread count 표시

### RAG 인덱싱

- 게시글 제목과 본문을 `rag_documents`, `rag_chunks`에 저장합니다.
- 게시글 수정 시 문서 hash와 chunk를 갱신합니다.
- 삭제 시 RAG 문서도 삭제합니다.

발표 포인트: 게시판 데이터가 단순 CRUD로 끝나지 않고, AI가 읽을 수 있는 RAG 지식 베이스로 변환됩니다.

## 11. 인증, 사용자, 개인화

| 기능 | 기술 | 설명 |
|---|---|---|
| 폼 로그인 | Spring Security + Thymeleaf | 개발/테스트용 로그인 |
| Google OAuth | Spring OAuth2 Client | 실제 사용자 로그인 |
| 사용자 저장 | PostgreSQL `app_users` | provider, email, display name, avatar, nickname 저장 |
| 대시보드 설정 | `user_dashboard_preferences` | 관심 지표, 이벤트, 리포트, 섹션 저장 |
| 프론트 개인화 | React state + API | 관심 지표 watchlist와 화면 구성 반영 |

## 12. 다국어 처리

### 프론트

- `front/src/i18n/i18n.ts`에 번역 catalog를 둡니다.
- localStorage key: `jungle-ai-locale`
- 언어 변경 UI: `LanguageControl`, `DisplaySettingsControl`

### 백엔드

- `LocaleResolver`가 query parameter와 `Accept-Language`를 해석합니다.
- `SupportedLocale`로 서버 지원 언어를 제한합니다.
- `EconomyTextCatalog`가 지표명, 카테고리, 해석, 리스크 문구를 locale별로 제공합니다.

### Agent

- Agent request/response에 locale을 포함합니다.
- Agent instruction에서 답변 언어를 명시합니다.

발표 포인트: 프론트 표시 언어, 백엔드 데이터 문구, AI 답변 언어가 같은 locale 흐름으로 연결됩니다.

## 13. DevOps와 배포 기술

### Docker

- 백엔드 Dockerfile은 multi-stage build입니다.
- build stage: `eclipse-temurin:21-jdk`
- runtime stage: `eclipse-temurin:21-jre`
- Maven package 후 `app.jar`로 실행합니다.

### GitHub Actions CI

- `ci.yml`
- backend job:
  - Java 21 setup
  - `./mvnw test`
- frontend job:
  - Node 20 setup
  - `npm ci`
  - `npm run build`

### 백엔드 AWS 배포

- `deploy-backend.yml`
- GitHub OIDC로 AWS 역할 Assume
- Amazon ECR 로그인
- Docker image build/push
- 현재 ECS task definition 다운로드
- 새 image URI를 task definition에 반영
- ECS service deploy
- 선택적 smoke test

### 프론트 AWS 배포

- `deploy-frontend.yml`
- Node 20으로 build
- `front/dist`를 S3 bucket에 sync
- CloudFront invalidation으로 CDN 캐시 갱신

### AWS 구성

| AWS 기술 | 역할 |
|---|---|
| IAM/OIDC | GitHub Actions에서 단기 권한으로 배포 |
| ECR | 백엔드 Docker 이미지 저장 |
| ECS Fargate | 백엔드 컨테이너 실행 |
| ALB | 외부 HTTP/HTTPS 요청을 ECS task로 전달하는 설계 |
| CloudWatch Logs | ECS task 로그 수집 설계 |
| S3 | 프론트 정적 파일 호스팅 |
| CloudFront | 프론트 CDN |
| RDS PostgreSQL | 운영 DB 전환 대상 |
| Secrets Manager/ECS env | 운영 secret 주입 대상 |

### GitHub 프로젝트 자동화

- issue opened: Slack 알림
- issue assigned: GitHub Project 상태를 In Progress로 이동
- PR opened: Slack 알림
- PR merged: GitHub Project 상태를 Done으로 이동, Slack 알림
- issue closed: GitHub Project 상태를 Done으로 이동

## 14. 환경 변수와 secret 관리

### 로컬

- `.env.local.example`: 백엔드, 프론트, Agent worker 공통 로컬 설정 예시
- `.env.agents.example`: Agent 관련 설정 예시
- `.env.cicd.example`: GitHub Actions/AWS 배포 설정 체크리스트

### 주요 환경 변수

| 변수 | 용도 |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL 연결 |
| `FRED_API_KEY` | FRED 지표 수집 |
| `BLS_API_KEY` | BLS source comparison |
| `BEA_API_KEY` | BEA source comparison |
| `ALPHA_VANTAGE_API_KEY` | market source comparison |
| `OPENAI_API_KEY` | OpenAI Responses/Embeddings/Agents |
| `OPENAI_BRIEF_MODEL` | 백엔드 브리핑 모델명 |
| `OPENAI_AGENT_MODEL` | Agent worker 모델명 |
| `OPENAI_EMBEDDING_MODEL` | RAG embedding 모델명 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `AGENT_WORKER_URL`, `AGENT_WORKER_TOKEN` | Spring backend -> FastAPI worker 호출 |
| `AGENT_MCP_URL` | Agent SDK -> MCP streamable HTTP |
| `AGENT_BACKEND_INTERNAL_URL` | worker -> Spring 내부 도구 API |
| `VITE_API_BASE_URL` | 프론트 API base URL |
| `VITE_BACKEND_ORIGIN` | 로그인/OAuth용 백엔드 origin |

발표 포인트: API key를 프론트에 노출하지 않고, 백엔드/worker/server-side에서만 사용하도록 분리합니다.

## 15. 테스트와 검증 기술

### 백엔드 테스트

- Maven test
- Spring Boot test
- WebMVC test
- Spring Security test
- Thymeleaf test
- H2 test profile

대표 테스트:

- `ApiIntegrationTests`
- `LoginSecurityTests`
- `BoardPostServiceTests`
- `AppUserServiceTests`
- `FredObservationMapperTests`
- `HttpAgentWorkerClientTests`

### 프론트 검증

- ESLint
- TypeScript build
- Vite production build

명령:

```powershell
cd front
npm run lint
npm run build
```

### Agent worker 테스트

- pytest
- FastAPI/Agent worker service 테스트

명령:

```powershell
cd agent-worker
pytest
```

### 배포 검증

- `aws-role.yml`: GitHub OIDC role 검증
- backend deploy smoke test: `HEALTH_CHECK_URL`이 설정된 경우 curl retry로 확인
- frontend deploy: S3 sync 후 CloudFront invalidation

## 16. 문서화 체계

| 폴더 | 역할 |
|---|---|
| `docs/concepts/` | 중요한 구현 개념 설명 |
| `docs/work-logs/` | 작업 단위 변경 파일, 의사결정, 검증 결과 |
| `docs/prompt-history/` | 사용자가 원문 저장을 승인한 prompt만 저장 |
| `docs/superpowers/` | 구현 계획과 설계 문서 |
| `study/` | 학습용 기술 설명 |
| `*.drawio` | AWS/CI-CD 아키텍처 다이어그램 |

특히 이 프로젝트는 prompt 원문 저장 전에 사용자 동의를 받아야 하므로, 발표 때 "AI 협업 기록도 개인정보/의도 보호 규칙을 세워 관리했다"고 설명할 수 있습니다.

## 17. 발표용 스토리라인

### 1단계: 문제 정의

미국 경제 지표는 흩어져 있고, 숫자만 보면 한국 사용자에게 어떤 의미인지 알기 어렵습니다.  
그래서 공식 출처 기반 데이터를 모아 AI가 읽고, 한국 영향까지 요약하는 대시보드가 필요했습니다.

### 2단계: 화면

React/Ionic/Vite로 대시보드, 게시판, Agent 워크벤치를 만들었습니다.  
사용자는 지표를 보고, 게시판에 토론하고, Agent에게 근거 있는 설명을 요청할 수 있습니다.

### 3단계: 백엔드

Spring Boot가 REST API, 인증, 사용자 설정, 게시판, 경제 데이터 캐시를 담당합니다.  
API는 Swagger로 확인할 수 있고, Security chain을 분리해 공개 API와 인증 API를 나눴습니다.

### 4단계: 데이터

PostgreSQL과 Flyway로 schema를 관리합니다.  
FRED, BLS, BEA, Alpha Vantage, GDELT 같은 외부 데이터를 수집하고, source URL과 함께 저장합니다.

### 5단계: AI

OpenAI Responses API는 경제 브리핑을 구조화 JSON으로 생성합니다.  
OpenAI Embeddings와 pgvector는 게시글/RAG 검색 확장 기반입니다.  
FastAPI worker와 OpenAI Agents SDK는 MCP 도구를 통해 검증된 데이터만 읽고 답변합니다.

### 6단계: 운영

GitHub Actions로 테스트와 배포를 자동화했습니다.  
백엔드는 Docker image를 ECR에 push하고 ECS Fargate에 배포합니다.  
프론트는 S3에 업로드하고 CloudFront 캐시를 무효화합니다.

## 18. 발표 때 강조할 차별점

1. 출처 기반 AI
   - AI가 아무 숫자나 말하지 않도록 evidence id와 source URL을 강제합니다.

2. 게시판과 RAG 연결
   - 사용자 토론 데이터가 나중에 AI 검색 지식 베이스가 됩니다.

3. 프론트/백엔드/Agent 분리
   - 화면, API, AI 실행 worker가 역할을 나눠 유지보수가 쉽습니다.

4. 다국어 흐름
   - 프론트 locale, 백엔드 locale, Agent locale이 연결됩니다.

5. 클라우드 배포까지 고려
   - 단순 로컬 과제가 아니라 AWS ECS/S3/CloudFront 배포 자동화까지 설계했습니다.

6. 실패 대응
   - OpenAI key가 없거나 외부 API가 실패해도 fallback과 sync status로 화면을 유지합니다.

## 19. 데모 순서 제안

1. `/home`에서 미국경제 대시보드 확인
2. 지표 카드와 히스토리 탭 확인
3. 이벤트/리포트 탭 확인
4. Google 로그인 또는 테스트 로그인 흐름 설명
5. 게시판에서 글/댓글/태그/좋아요/신고/알림 구조 설명
6. Agent 탭에서 브리핑 run과 evidence id 설명
7. Swagger UI에서 API 계약 확인
8. GitHub Actions workflow로 CI/CD 흐름 설명
9. DB migration 파일로 PostgreSQL/Flyway/pgvector 구조 설명

## 20. 예상 질문과 답변

### Q. 왜 Spring Boot를 사용했나요?

보안, REST API, JPA, scheduling, Swagger, 외부 API 호출, Docker 배포까지 한 프레임워크 안에서 안정적으로 구성할 수 있기 때문입니다.

### Q. 왜 프론트에 OpenAI API key를 넣지 않았나요?

브라우저에 key를 넣으면 사용자가 볼 수 있습니다. 그래서 OpenAI 호출은 Spring 백엔드와 FastAPI worker 같은 server-side에서만 수행합니다.

### Q. RAG가 지금 어디까지 되어 있나요?

게시글을 RAG 문서/청크로 인덱싱하고 embedding 저장 컬럼까지 준비했습니다. 현재 검색은 키워드 기반이고, pgvector similarity search는 다음 확장 단계입니다.

### Q. Agent는 그냥 ChatGPT 호출과 뭐가 다른가요?

Agent는 MCP 도구를 통해 검증된 데이터만 조회하고, evidence id가 없으면 답변을 확정하지 않는 guardrail을 둡니다. 즉, 자유 대화보다 "도구 사용 + 검증 + 구조화 응답"에 초점이 있습니다.

### Q. AWS에서는 어떻게 배포되나요?

백엔드는 GitHub Actions가 OIDC로 AWS 권한을 얻고, Docker image를 ECR에 push한 뒤 ECS Fargate service를 업데이트합니다. 프론트는 Vite build 결과를 S3에 올리고 CloudFront cache를 invalidate합니다.

### Q. 데이터 출처는 무엇인가요?

FRED가 핵심 지표 최신값과 히스토리를 담당합니다. BLS/BEA/Alpha Vantage는 source comparison과 보조 데이터, GDELT는 관련 뉴스 검색, OpenAI는 요약과 Agent 답변 생성에 사용됩니다.

## 21. 현재 보강하면 좋은 점

1. `agent-worker/requirements.txt`에 `httpx` 직접 명시
2. README의 오래된 `deploy.yml` 표현을 현재 `deploy-backend.yml`, `deploy-frontend.yml` 기준으로 정리
3. pgvector similarity search 쿼리 추가
4. Agent worker 배포 workflow 추가
5. 외부 API 실패/쿼터 초과 시 사용자-facing 상태 표시 강화
6. 운영 secret은 GitHub Secrets, ECS task env, AWS Secrets Manager로 분리

## 22. 한 장 발표 요약

```text
프로젝트명: AI가 읽는 미국경제 대시보드

핵심 목표:
- 미국 경제 지표를 공식 출처 기반으로 수집
- AI가 출처 있는 데이터만 요약
- 한국 사용자에게 환율/수출/금리/시장 영향까지 설명
- 게시판 데이터를 RAG 지식 베이스로 확장

핵심 기술:
- Frontend: React, TypeScript, Vite, Ionic React, Capacitor
- Backend: Java 21, Spring Boot 4, Security, OAuth2, JPA, OpenAPI
- Database: PostgreSQL, Flyway, pgvector, H2 test
- AI: OpenAI Responses API, Embeddings API, Agents SDK, MCP, Guardrails
- Worker: FastAPI, Uvicorn, Pydantic, pytest
- Data: FRED, BLS, BEA, Alpha Vantage, GDELT
- DevOps: Docker, GitHub Actions, OIDC, ECR, ECS Fargate, S3, CloudFront, Slack

차별점:
- AI가 숫자를 지어내지 않도록 evidence 기반으로 제한
- 게시판과 RAG를 연결해 사용자 토론을 AI 검색 자산으로 전환
- 로컬 개발에서 AWS 배포까지 이어지는 풀스택 구조
```

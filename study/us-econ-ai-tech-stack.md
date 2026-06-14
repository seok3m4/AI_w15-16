# US ECON AI 기술 스택 학습 노트

## 이 문서의 목적

이 문서는 `AI가 읽어주는 미국 경제 대시보드`가 어떤 기술 조합으로 만들어지는지 공부하기 위한 정리입니다. 핵심은 "프론트엔드 화면", "백엔드 API 계약", "데이터 저장/검증", "나중에 붙일 AI 에이전트 구조"를 분리해서 이해하는 것입니다.

## 전체 구조

```text
Ionic React 화면
-> Vite 개발 서버 proxy
-> Spring Boot REST API
-> JPA/Flyway/PostgreSQL
-> 환경 변수 기반 Agent 설정
-> 이후 OpenAI API/Agents + 외부 경제 데이터 API
```

현재 MVP는 실시간 데이터 연동보다 먼저 정적 샘플 데이터와 구조화된 API 계약으로 첫 화면을 설득력 있게 만드는 단계입니다.

현재 추가된 Agent 준비 요소는 다음입니다.

- `.env.agents.example`: Git에 올리는 Agent 환경변수 템플릿
- `.env.agents.local`: 로컬에서 사람이 직접 채우는 비밀값 파일
- `OPENAI_AGENT_MODEL=gpt-5.5`: AI 요약에 사용할 OpenAI 모델 설정
- `US_ECON_DATA_MODE=sample`: 실데이터 연결 전 샘플 데이터 모드
- `BLS_API_KEY`, `FRED_API_KEY`, `NEWS_SEARCH_API_KEY`: 나중에 공식 지표/뉴스 API를 붙일 때 채울 값

## 프론트엔드

### React

- 위치: `front/src/pages/HomePage.tsx`
- 역할: 대시보드 화면을 컴포넌트 단위로 렌더링합니다.
- 공부 포인트:
  - `useState`: 화면 상태 저장
  - `useEffect`: API 호출 같은 초기 로딩
  - `useMemo`: 게시글/지표 목록에서 계산값 만들기
  - 타입스크립트 interface: API 응답 형태를 코드로 고정

### Ionic React

- 위치: `front/package.json`
- 주요 패키지: `@ionic/react`, `@ionic/react-router`
- 역할: 모바일 친화적인 앱 UI 컴포넌트를 제공합니다.
- 이 프로젝트에서 쓰는 컴포넌트:
  - `IonPage`, `IonContent`: 앱 화면 틀
  - `IonButton`: 버튼
  - `IonInput`, `IonTextarea`: 입력 폼
  - `IonBadge`, `IonChip`: 상태와 태그 표시
  - `IonIcon`: 아이콘 표시

### TypeScript

- 위치: `front/tsconfig.app.json`
- 역할: 화면과 API 데이터 형태를 컴파일 시점에 검사합니다.
- 왜 중요한가:
  - 경제 지표는 `value`, `unit`, `baseDate`, `sourceUrl` 같은 필수 필드를 빠뜨리면 신뢰가 깨집니다.
  - TypeScript interface를 쓰면 API 응답 구조가 바뀌었을 때 프론트 코드가 빨리 실패합니다.

### Vite

- 위치: `front/vite.config.ts`
- 역할: React 개발 서버와 빌드 도구입니다.
- 현재 proxy:

```ts
server: {
  proxy: {
    "/api": {
      target: "http://localhost:8080",
      changeOrigin: true,
    },
  },
}
```

프론트에서 `/api/us-economy/dashboard`를 호출하면 개발 중에는 Spring Boot 서버 `http://localhost:8080`으로 전달됩니다.

### CSS

- 위치:
  - `front/src/pages/HomePage.css`
  - `front/src/theme/variables.css`
- 역할: 금융 터미널과 리포트형 대시보드 사이의 시각 톤을 만듭니다.
- 공부 포인트:
  - CSS Grid로 큰 정보 영역 배치
  - 모바일 media query
  - Ionic CSS 변수로 기본 색상 통일

## 백엔드

### Java 21

- 위치: `backend/pom.xml`
- 설정:

```xml
<java.version>21</java.version>
```

Java `record`를 사용하면 API 응답 DTO를 짧게 만들 수 있습니다.

### Spring Boot

- 위치:
  - `backend/src/main/java/com/junglecamp/backend/BackendApplication.java`
  - `backend/pom.xml`
- 역할: 백엔드 애플리케이션 실행과 REST API 제공을 담당합니다.
- 주요 의존성:
  - `spring-boot-starter-webmvc`: REST API
  - `spring-boot-starter-data-jpa`: DB 엔티티/레포지토리
  - `spring-boot-starter-security`: 로그인과 API 보호
  - `spring-boot-starter-thymeleaf`: 서버 렌더링 로그인 페이지

### REST Controller

- 위치:
  - `backend/src/main/java/com/junglecamp/backend/controller/ApiController.java`
  - `backend/src/main/java/com/junglecamp/backend/controller/BoardPostController.java`
  - `backend/src/main/java/com/junglecamp/backend/controller/UsEconomyDashboardController.java`
- 역할: 프론트엔드가 호출할 HTTP API를 정의합니다.
- 미국 경제 대시보드 API:

```text
GET /api/us-economy/dashboard
```

이 API는 다음 묶음을 반환하는 방향입니다.

- `AiBrief`: 10초 안에 읽는 AI 요약
- `MetricSnapshot`: 기준일, 단위, 출처가 있는 경제 지표
- `EconomicEvent`: 발표 전/후 상태가 구분되는 경제 일정
- `MarketSignal`: 위험 선호, 금리 압력, 달러 강세 같은 시장 상태
- `KoreaImpact`: 환율, 수출, 금리, 관세/규제 관점의 한국 영향
- `ReportItem`: 출처가 있는 뉴스/리포트 요약
- `AgentTraceStep`: 어떤 에이전트/검증 단계가 작동했는지 남기는 흔적

### Spring Security

- 위치: `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- 역할:
  - 공개 API와 로그인 필요 API를 분리합니다.
  - `/api/status`, 게시글 조회, 태그 조회 같은 읽기 API는 공개합니다.
  - 게시글 작성/수정/삭제와 `/api/me`는 인증이 필요합니다.
- 미국 경제 대시보드는 첫 화면 조회용이므로 공개 GET API로 두는 것이 자연스럽습니다.

### JPA

- 위치: `backend/src/main/java/com/junglecamp/backend/board/`
- 역할: 게시글, 댓글, 태그 같은 DB row를 Java 객체로 다룹니다.
- 경제 지표도 나중에는 `MetricSnapshot` 같은 DTO에서 출발해 JPA Entity로 확장할 수 있습니다.

### Flyway

- 위치: `backend/src/main/resources/db/migration/`
- 역할: DB schema 변경을 버전 파일로 관리합니다.
- 현재 예:

```text
V1__create_board_and_rag_schema.sql
```

경제 지표를 저장하기 시작하면 `V2__create_us_economy_schema.sql` 같은 방식으로 확장할 수 있습니다.

### PostgreSQL / RDS / pgvector

- 위치:
  - `backend/src/main/resources/application.properties`
  - `study/postgresql-rds-rag.md`
- 역할:
  - PostgreSQL: 운영 데이터베이스
  - AWS RDS: 배포 환경의 관리형 PostgreSQL
  - pgvector: 나중에 리포트/게시글/뉴스를 임베딩 검색하기 위한 확장
- 현재 datasource:

```properties
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/jungle_ai}
spring.datasource.username=${DB_USERNAME:jungle}
spring.datasource.password=${DB_PASSWORD:jungle}
```

## Agent와 환경 변수

### `.env.agents.example`

- 위치: `.env.agents.example`
- 역할: Agent 기능에 필요한 환경변수 목록을 문서처럼 보여주는 템플릿입니다.
- Git에 올라가도 되는 파일이지만 실제 API key 값은 비워둡니다.

### `.env.agents.local`

- 위치: `.env.agents.local`
- 역할: 로컬 개발자가 직접 OpenAI API key와 모델명을 넣는 파일입니다.
- `.gitignore`에 의해 Git에 올라가지 않습니다.
- 현재 공부할 핵심 값:

```env
US_ECON_AGENTS_ENABLED=false
OPENAI_API_KEY=직접 입력
OPENAI_AGENT_MODEL=gpt-5.5
US_ECON_DATA_MODE=sample
```

`US_ECON_AGENTS_ENABLED=false`는 아직 실제 Agent 호출을 켜지 않고, API 계약과 화면 구조를 먼저 만드는 상태라는 뜻입니다. 나중에 OpenAI 호출 로직이 붙으면 이 값을 `true`로 바꿔 Agent 요약을 켜는 방식으로 확장할 수 있습니다.

### Secret 등록 위치

OpenAI API key는 코드나 README에 넣지 않습니다. 환경별로 다음 위치에 등록합니다.

- 로컬: `.env.agents.local`
- GitHub Actions: GitHub Secrets
- ECS 배포: ECS task definition 환경변수 또는 AWS Secrets Manager

프론트엔드 `front/.env`에는 OpenAI API key를 넣지 않습니다. 브라우저에 노출될 수 있기 때문에 OpenAI 호출은 백엔드에서만 수행해야 합니다.

## OpenAI API / Agents

### OpenAI API

- 역할: 최신 지표와 검증된 근거를 받아 한국어 AI 요약을 생성합니다.
- 이 프로젝트에서는 프론트가 직접 OpenAI를 호출하지 않고, Spring Boot 백엔드가 OpenAI API를 호출하는 구조가 안전합니다.
- 모델 설정은 코드에 박지 않고 `OPENAI_AGENT_MODEL` 환경변수에서 읽는 방향이 좋습니다.

### GPT-5.5

- 설정 위치: `.env.agents.local`
- 현재 값:

```env
OPENAI_AGENT_MODEL=gpt-5.5
```

이 값은 "AI 요약에 어떤 OpenAI 모델을 쓸지"를 정합니다. 나중에 비용, 속도, 품질에 따라 모델을 바꾸더라도 코드 수정 없이 환경변수만 바꾸면 됩니다.

### Agent Trace / Evals / Human Review

Agent 기능을 붙일 때는 결과만 저장하면 나중에 품질 개선이 어렵습니다. 그래서 다음 스위치를 환경변수로 준비합니다.

```env
OPENAI_AGENT_TRACE_ENABLED=true
OPENAI_AGENT_EVALS_ENABLED=false
OPENAI_AGENT_HUMAN_REVIEW_REQUIRED=true
```

- `TRACE`: 어떤 지표와 도구 호출을 근거로 요약했는지 기록
- `EVALS`: 요약 품질과 숫자 정확성 평가
- `HUMAN_REVIEW`: 투자 판단이나 민감한 통상 이슈는 사람이 검토할 수 있게 하는 안전장치

## 외부 경제 데이터 API 후보

### BLS API

- 환경변수: `BLS_API_KEY`
- 후보 데이터: CPI, 실업률, 비농업고용
- 연결 이유: 미국 고용과 물가 지표의 공식 출처입니다.

### FRED API

- 환경변수: `FRED_API_KEY`
- 후보 데이터: 금리, 거시 시계열, 일부 Fed 관련 지표
- 연결 이유: 여러 경제 시계열을 같은 방식으로 조회하기 좋습니다.

### News Search API

- 환경변수: `NEWS_SEARCH_API_KEY`
- 후보 데이터: Fed 발언, 통상 뉴스, 공급망/산업 리포트
- 연결 이유: 숫자 지표만으로 설명되지 않는 정책/뉴스 맥락을 보강합니다.

외부 데이터는 바로 AI 요약 근거로 쓰지 않고, 먼저 `sourceName`, `sourceUrl`, `baseDate`, `unit`이 있는 구조화 데이터로 바꾼 뒤 사용해야 합니다.

## API 계약 관점에서 봐야 할 것

경제 대시보드에서 가장 중요한 것은 "숫자만 보여주기"가 아니라 숫자의 신뢰 조건을 같이 보내는 것입니다.

`MetricSnapshot`은 최소한 다음 필드를 가져야 합니다.

```text
id
name
category
value
unit
period
baseDate
sourceName
sourceUrl
previousValue
change
changePercent
interpretation
updatedAt
```

프론트엔드는 이 필드를 그대로 받아 화면에 반복 표시합니다. 그래서 백엔드가 빠뜨린 필드는 화면 신뢰도 문제로 바로 이어집니다.

## AI 에이전트 관점

OpenAI Agents는 아직 직접 붙이지 않았지만, 화면과 API 구조는 에이전트가 붙기 좋게 만들어야 합니다.

학습할 개념은 다음입니다.

- `instructions`: 경제 브리핑 매니저가 어떤 말투와 규칙으로 요약할지
- `tools`: BLS, Treasury, Census, Fed, 뉴스 검색 같은 데이터 조회 도구
- `handoffs`: 거시지표, 시장지표, 경제일정, 한국 영향 해석 담당 분리
- `outputType`: 프론트가 받을 수 있는 구조화 JSON
- `guardrails`: 출처 누락, 단위 누락, 실제치/예상치 혼동 방지
- `traces`: 어떤 근거로 요약했는지 나중에 추적
- `evals`: 요약 품질과 숫자 정확성을 반복 평가

현재 코드의 `AgentTraceStep`은 실제 OpenAI Agents SDK 호출 기록은 아니지만, 나중에 trace를 저장할 화면/API 자리입니다. MVP에서는 정적 trace 예시로 시작하고, 실제 Agent가 붙으면 도구 호출, guardrail 결과, 최종 요약 생성 단계를 이 구조에 연결합니다.

## 실행과 검증 명령

### 프론트엔드

```powershell
cd front
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

확인할 화면:

```text
http://localhost:5173/home
```

### 백엔드

```powershell
cd backend
mvn test
mvn spring-boot:run
```

Agent 환경변수를 PowerShell에서 직접 주입해 실행할 때는 다음처럼 시작할 수 있습니다.

```powershell
$env:OPENAI_API_KEY="직접 입력"
$env:OPENAI_AGENT_MODEL="gpt-5.5"
$env:US_ECON_DATA_MODE="sample"
cd backend
mvn spring-boot:run
```

확인할 API:

```text
http://localhost:8080/api/status
http://localhost:8080/api/us-economy/dashboard
http://localhost:8080/swagger-ui.html
```

## 추천 학습 순서

1. `study/us-econ-ai-agents-concepts.md`로 제품 목표를 먼저 읽습니다.
2. `front/src/pages/HomePage.tsx`에서 화면이 어떤 데이터 단위로 나뉘는지 봅니다.
3. `backend/src/main/java/com/junglecamp/backend/controller/UsEconomyDashboardController.java`에서 API 응답 구조를 확인합니다.
4. `front/vite.config.ts`에서 `/api` proxy 흐름을 이해합니다.
5. `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`에서 공개 API와 인증 API 분리를 봅니다.
6. `.env.agents.example`에서 Agent 환경변수 목록을 확인합니다.
7. `study/postgresql-rds-rag.md`에서 나중에 DB와 RAG 검색으로 확장되는 방향을 공부합니다.

## 지금 MVP와 다음 단계

현재 MVP의 초점은 다음입니다.

- 정적 샘플 데이터로 첫 화면 완성
- 구조화된 경제 대시보드 API 계약 정의
- AI 요약이 실제 지표 id와 연결되도록 설계
- 한국 영향과 guardrail/traces 개념을 화면 데이터에 포함

다음 단계는 다음 순서가 좋습니다.

- 프론트에서 `GET /api/us-economy/dashboard`를 실제로 호출
- `MetricSnapshot`, `EconomicEvent`를 DB 테이블로 분리
- BLS, Treasury, Census, Fed 같은 공식 데이터 출처 연결
- OpenAI Agents로 요약 생성과 검증 guardrail 연결
- `.env.agents.example`에 새 Agent key가 생길 때마다 같은 문서에 학습용 설명 추가
- 출처 없는 리포트가 AI 요약 근거가 되지 않도록 eval 추가

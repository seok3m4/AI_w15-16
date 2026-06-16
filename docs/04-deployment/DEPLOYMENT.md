# 배포 설계 — Memento MVP (Track A 로컬 / Track B AWS)

이 문서는 Memento MVP의 배포/실행 설계를 두 트랙으로 다룬다.

- **Track A (로컬 Docker)**: AWS 없이 로컬 PC에서 Docker로 전체 시스템을 실행한다. 기능 구현과 1차 데모 smoke를 담당한다.
- **Track B (AWS)**: 최종 구현 이후 AWS(ECS Fargate + RDS + S3/CloudFront)에 배포한다. Track A smoke 통과를 전제로 한다.

> 현재 저장소는 기획/설계 문서 중심이며 실제 `backend/`, `ai-server/`, `frontend/`, `docker-compose.yml` 구현은 후속 작업이다. 이 문서는 해당 파일들을 만들 때 따라야 할 실행 계약을 고정한다.

---

# Part 1. Track A — 로컬 Docker 실행

## 1.1 목표 결과

- `docker compose up --build`로 PostgreSQL/pgvector, Spring Boot, FastAPI, React를 함께 실행한다.
- 로컬 데이터는 Docker volume에 유지한다.
- 로컬에서는 HTTPS 없이 실행하며, refresh token cookie의 `Secure` 속성은 예외 처리할 수 있다.
- AI provider는 mock mode를 기본값으로 둘 수 있고, 실제 OpenAI API는 환경 변수로 전환한다.
- 회원가입, 로그인, 게시글 작성, memory status, Memory Search, AI 요약 smoke check를 로컬에서 먼저 통과시킨다.
- Track A smoke가 안정화된 뒤 Track B AWS 배포로 넘어간다.

## 1.2 선택한 범위

| 영역 | Track A 결정 |
|------|--------------|
| 실행 방식 | Docker Compose |
| 대상 환경 | 개발자 로컬 PC |
| Database | PostgreSQL + pgvector container |
| Backend API | Spring Boot container |
| AI Service | FastAPI container |
| Frontend | Vite dev server container 또는 정적 preview container |
| Secret 관리 | `.env.local` 또는 `.env`, Git 커밋 금지 |
| AI provider | mock 기본, real provider는 명시적 env로 전환 |
| 검증 | health check + MVP smoke scenario |

## 1.3 로컬 아키텍처

```text
Browser
  |
  | http://localhost:5173
  v
React Frontend

Browser
  |
  | http://localhost:8080/api/v1
  v
Spring Boot Backend API
  |
  | Docker network: postgres:5432
  +--> PostgreSQL + pgvector
  |
  | Docker network: ai-server:8000
  +--> FastAPI AI Server
          |
          +--> mock AI provider or external OpenAI API
```

외부 포트 기본값:

| Service | Host URL | Container/network URL |
|---------|----------|-----------------------|
| frontend | `http://localhost:5173` | `http://frontend:5173` |
| backend | `http://localhost:8080` | `http://backend:8080` |
| ai-server | `http://localhost:8000` | `http://ai-server:8000` |
| postgres | `localhost:5432` 또는 비공개 | `postgres:5432` |

PostgreSQL host port는 DB GUI 접속이 필요할 때만 열어도 된다. 기본 운영 사고를 줄이려면 애플리케이션 컨테이너만 Docker network 안에서 `postgres:5432`로 접근하게 둔다.

## 1.4 Compose 서비스 계약

후속 구현의 `docker-compose.yml`은 최소한 다음 서비스를 포함한다.

### 1.4.1 postgres

- image는 pgvector가 포함된 PostgreSQL image를 사용한다.
- persistent volume을 사용한다.
- 최초 migration에서 `CREATE EXTENSION IF NOT EXISTS vector;`를 실행한다.
- health check는 `pg_isready`를 사용한다.

필수 env:

```text
POSTGRES_DB=memento
POSTGRES_USER=memento
POSTGRES_PASSWORD=memento_local_password
```

### 1.4.2 backend

- Spring Boot API를 실행한다.
- `postgres` health check 이후 시작한다.
- `ai-server`를 Docker network name으로 호출한다.
- 로컬에서는 CORS origin으로 `http://localhost:5173`만 허용한다.

필수 env:

```text
SPRING_PROFILES_ACTIVE=local
DATABASE_URL=jdbc:postgresql://postgres:5432/memento
DATABASE_USERNAME=memento
DATABASE_PASSWORD=memento_local_password
AI_SERVER_URL=http://ai-server:8000
JWT_SIGNING_KEY=local-dev-only-change-me
REFRESH_TOKEN_PEPPER=local-dev-only-change-me
FRONTEND_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
```

### 1.4.3 ai-server

- FastAPI AI service를 실행한다.
- local 기본값은 mock provider다.
- 실제 provider를 사용할 때만 `OPENAI_API_KEY`를 넣는다.

필수 env:

```text
AI_PROFILE=local
AI_PROVIDER=mock
OPENAI_API_KEY=
```

### 1.4.4 frontend

- Vite dev server를 실행한다.
- container 내부에서 backend API를 직접 호출하지 않고, 브라우저 기준 URL을 사용한다.

필수 env:

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## 1.5 실행 절차

### 1.5.1 최초 실행

```bash
cp .env.example .env.local
docker compose --env-file .env.local up --build
```

구현 전에는 위 명령이 목표 계약이다. 실제 파일 작성 시 Windows PowerShell에서도 동작하도록 명령을 별도 검증한다.

### 1.5.2 재실행

```bash
docker compose --env-file .env.local up
```

### 1.5.3 데이터 초기화

```bash
docker compose down
docker volume rm <project>_postgres_data
docker compose --env-file .env.local up --build
```

데이터 초기화 명령은 로컬 개발 전용이다. 공유 DB나 AWS RDS에는 사용하지 않는다.

## 1.6 로컬 보안 기준

- `.env.local`, `.env`, 실제 API key 파일은 Git에 커밋하지 않는다.
- 로컬 기본 password와 JWT key는 개발용이며 운영에 재사용하지 않는다.
- `COOKIE_SECURE=false`는 로컬 HTTP 전용이다. AWS Track B에서는 반드시 `true`다.
- `AI_PROVIDER=mock`일 때는 외부 API 호출과 비용이 발생하지 않아야 한다.
- 실제 OpenAI API key를 넣은 경우 로그에 prompt, token, key 원문을 출력하지 않는다.

## 1.7 관측성과 로그

로컬 기본 확인:

- `docker compose ps`
- `docker compose logs backend`
- `docker compose logs ai-server`
- `docker compose logs postgres`

로그에 포함할 것: request/correlation id, endpoint·status·latency, memory job status, AI provider mode(`mock`/`real`).
로그에 포함하지 않을 것: refresh token 원문, OpenAI API key, 사용자 게시글/댓글 원문 전체, LLM prompt 원문 전체.

## 1.8 로컬 Smoke Check

1. `docker compose --env-file .env.local up --build`
2. `GET http://localhost:8080/api/health`
3. `GET http://localhost:8000/health`
4. `http://localhost:5173` 접속
5. 회원가입
6. 로그인 후 refresh token cookie 설정 확인
7. 게시글 작성
8. 게시글 목록/상세 조회
9. memory status 확인
10. Memory Search 실행
11. AI 요약 실행
12. `docker compose restart backend ai-server` 후 데이터 유지 확인

## 1.9 실패 모드와 대응

| 실패 모드 | 확인 지점 | 대응 |
|-----------|-----------|------|
| postgres health check 실패 | `docker compose logs postgres` | volume 권한, port 충돌, env 값을 확인한다. |
| backend DB 연결 실패 | backend logs, `DATABASE_URL` | service name이 `postgres`인지 확인한다. |
| frontend CORS 실패 | browser console, backend CORS 설정 | `FRONTEND_ORIGIN=http://localhost:5173`인지 확인한다. |
| cookie 저장 실패 | browser devtools | 로컬에서는 `COOKIE_SECURE=false`, path `/api/v1/auth`를 확인한다. |
| ai-server 호출 실패 | backend logs, `AI_SERVER_URL` | Docker network URL이 `http://ai-server:8000`인지 확인한다. |
| AI 비용 발생 우려 | ai-server logs, env | 기본값을 `AI_PROVIDER=mock`으로 둔다. |
| memory search 실패 | migration logs, DB extension | `vector` extension 생성 여부를 확인한다. |

## 1.10 Track B로 넘어가는 기준

AWS 배포를 시작하기 전 Track A에서 다음을 만족해야 한다.

- 로컬 Docker smoke check가 통과한다.
- migration이 새 DB에서도 재현 가능하다.
- Docker image build가 backend와 ai-server에서 성공한다.
- `.env.example`에 필수 설정이 문서화되어 있다.
- mock AI provider와 real provider 전환 방식이 확인되어 있다.
- 로그에 token, secret, prompt 원문이 남지 않는다.

## 1.11 후속 구현 메모 (Track A)

- 실제 `docker-compose.yml`, Dockerfile, `.env.example`은 이 문서를 기준으로 작성한다.
- 개발 편의를 위해 backend, ai-server, frontend를 bind mount로 hot reload할지 여부는 구현 시 결정한다.
- CI에서 Track A smoke를 일부 자동화하려면 DB와 backend/ai-server health check부터 시작한다.

---

# Part 2. Track B — AWS 배포

## 2.1 목표 결과

기본 배포 목표는 운영 베타가 아니라 **MVP 데모 환경**이다. 사용자가 HTTPS 도메인으로 React 앱에 접속하고, Spring Boot API와 FastAPI AI Server가 RDS PostgreSQL/pgvector를 사용해 핵심 smoke scenario를 수행할 수 있으면 성공으로 본다. 공식 AWS 기준 아키텍처는 `ECS Fargate + RDS + S3/CloudFront`로 고정한다.

- React/Vite 프론트엔드는 private S3 bucket을 CloudFront origin으로 연결해 제공한다.
- Spring Boot Backend API와 FastAPI AI Server는 각각 ECS Fargate service로 실행한다.
- PostgreSQL과 pgvector는 RDS PostgreSQL에서 운영한다.
- API 외부 진입점은 ALB와 ACM HTTPS 인증서를 사용한다.
- S3 frontend bucket은 public access를 막고 CloudFront Origin Access Control(OAC)로만 읽게 한다.
- FastAPI AI Server는 기본적으로 외부에 공개하지 않고 Spring Boot가 내부 service discovery로 호출한다.
- secret, token pepper, 외부 API key, DB password는 AWS Secrets Manager와 KMS로 관리한다.
- CloudWatch Logs에서 Spring Boot, FastAPI, ECS task 로그를 확인할 수 있다.
- 배포 후 회원가입, 로그인, 게시글 작성, memory 처리, Memory Search, AI 요약 smoke check가 통과한다.
- 장애 시 이전 ECS task definition 또는 이전 프론트 빌드로 수동 롤백할 수 있다.

## 2.2 선택한 범위

| 영역 | MVP 결정 |
|------|----------|
| 배포 목표 | MVP 데모 환경 |
| 선행 트랙 | Track A 로컬 Docker smoke 통과 |
| 공식 compute | ECS Fargate |
| Frontend hosting | S3 + CloudFront |
| API ingress | ALB + ACM HTTPS |
| Database | RDS PostgreSQL + pgvector extension |
| Container registry | ECR |
| Secret 관리 | Secrets Manager + KMS |
| Logs/metrics | CloudWatch Logs, ECS/ALB/RDS 기본 metrics |
| Frontend origin 보호 | S3 Block Public Access + CloudFront OAC |
| 내부 서비스 통신 | ECS Service Connect 또는 Cloud Map, security group 제한 |
| DB migration | 배포 전 one-off migration task 또는 CI/CD migration step |
| IaC | MVP에서는 수동 구축 또는 CLI 문서화, Terraform/CDK는 후속 후보 |

## 2.3 검토한 대안

| 대안 | 판단 |
|------|------|
| ECS Fargate + RDS | 공식 MVP 기준. Spring Boot/FastAPI를 컨테이너 단위로 분리하고 RDS, Secrets Manager, ALB와 자연스럽게 연결된다. |
| 로컬 Docker Compose | Track A로 분리한다. 기능 smoke와 팀 데모 1차 검증에는 적합하지만 AWS 운영 네트워크, secret, 인증서, RDS 백업 검증을 대체하지 않는다. |
| Elastic Beanstalk | 단일 웹앱 배포는 빠르지만 Spring Boot, FastAPI, worker, pgvector, secret 경계를 명확히 나누기 애매하다. |
| Amplify frontend | 프론트 CI/CD에는 편하지만 전체 백엔드 인프라 설계와 분리된다. MVP 공식 프론트는 S3+CloudFront로 둔다. |

## 2.4 AWS 아키텍처

```text
User Browser
  |
  | HTTPS
  v
CloudFront
  |
  | OAC signed requests
  |
  | static assets
  v
Private S3 frontend bucket

User Browser
  |
  | HTTPS /api/v1/*
  v
ALB
  |
  +--> ECS Fargate: Spring Boot Backend API
  |       |
  |       +--> internal DNS / Service Connect
  |       +--> ECS Fargate: FastAPI AI Server
  |       +--> RDS PostgreSQL + pgvector
  |       +--> Secrets Manager / KMS

ECR
  +--> backend image
  +--> ai-server image

CloudWatch Logs
  +--> backend logs
  +--> ai-server logs
  +--> ECS task events
```

네트워크 기본값:

- VPC는 public subnet과 private subnet을 분리한다.
- ALB는 public subnet에 둔다.
- ECS service와 RDS는 private subnet에 둔다.
- Spring Boot service만 public ALB target으로 연결한다. FastAPI는 기본적으로 public listener에 붙이지 않는다.
- Spring Boot에서 FastAPI로 가는 호출은 ECS Service Connect, Cloud Map, 또는 내부 load balancer 중 하나로 고정한다.
- ECS task가 외부 LLM API를 호출해야 하므로 NAT Gateway 또는 제한된 outbound 경로가 필요하다.
- private subnet의 ECS task가 ECR image pull, CloudWatch Logs, Secrets Manager, S3 접근을 안정적으로 수행하도록 VPC endpoint(ECR api/dkr, CloudWatch Logs, Secrets Manager, S3 Gateway)를 검토한다.
- 비용을 줄이기 위해 NAT Gateway를 생략하려면, 외부 LLM 호출이 필요한 FastAPI task가 어떻게 outbound internet에 접근할지 별도로 결정해야 한다.
- 비용을 낮추는 실험은 Track A 로컬 Docker에서 먼저 수행한다. Track B는 private subnet 기준을 우선한다.

## 2.5 서비스 책임과 데이터 흐름

### 2.5.1 Frontend

- Vite build output을 S3 bucket에 업로드한다.
- CloudFront가 HTTPS와 캐싱을 담당한다.
- API base URL은 운영 환경 변수 또는 build-time config로 `https://api.<domain>/api/v1`을 사용한다.
- S3 bucket은 정적 웹사이트 endpoint가 아니라 일반 S3 origin으로 사용하고, Block Public Access를 유지한다.
- CloudFront는 OAC로 S3 origin 요청에 서명한다. S3 bucket policy는 해당 CloudFront distribution만 `s3:GetObject`를 허용한다.
- SPA routing은 CloudFront custom error response 또는 CloudFront Function으로 403/404를 `/index.html` `200`으로 fallback한다.
- `index.html`은 짧은 cache 또는 no-cache로 두고, hash가 붙은 JS/CSS asset은 긴 cache를 적용한다.
- CloudFront용 ACM 인증서는 `us-east-1`에 발급한다.

### 2.5.2 Spring Boot Backend API

- 인증, 권한, 게시글 CRUD, 친구 관계, API orchestration을 담당한다.
- ALB target group health check는 `GET /api/health`를 사용한다.
- RDS PostgreSQL에 직접 연결한다.
- FastAPI AI Server 호출 URL은 ECS service discovery 또는 내부 DNS를 사용한다.
- JWT signing key, refresh token HMAC pepper, DB credential은 Secrets Manager에서 주입한다.
- ALB용 ACM 인증서는 ALB가 배포되는 리전에 발급한다.
- MVP에서는 RDS 직접 연결로 시작하되, task 수가 늘거나 connection churn이 보이면 RDS Proxy 도입을 검토한다.
- HikariCP 같은 connection pool의 max size는 RDS instance class와 ECS desired task 수를 기준으로 제한한다.

### 2.5.3 FastAPI AI Server

- embedding 생성, AI 요약, Agent/tool orchestration을 담당한다.
- health check는 `GET /health`를 사용한다.
- OpenAI API key 등 외부 AI provider secret은 Secrets Manager에서 주입한다.
- RDS 직접 접근이 필요한 구현이면 동일 DB credential 정책을 따른다. 가능하면 Spring Boot가 권한 검증을 마친 작업 요청만 FastAPI에 전달한다.
- FastAPI는 기본적으로 private subnet 내부 서비스로만 노출한다.
- FastAPI health check는 ECS target health, Service Connect 내부 호출, 또는 private subnet 안에서 실행하는 smoke command로 확인한다.
- FastAPI를 public ALB에 직접 노출해야 하는 경우에는 별도 path rule, 인증, rate limit, CORS 정책을 추가로 설계한다.

### 2.5.4 RDS PostgreSQL + pgvector

- PostgreSQL major version은 pgvector extension을 지원하는 버전으로 선택한다.
- 최초 migration에서 `CREATE EXTENSION IF NOT EXISTS vector;`를 수행한다.
- storage encryption은 KMS 기반으로 활성화한다.
- 자동 백업을 켜고, MVP 데모 환경에서도 최소 7일 보존을 기본값으로 둔다.
- public access는 비활성화한다.
- RDS engine version과 대상 리전에서 `pgvector`가 지원되는지 생성 전에 확인한다.
- `CREATE EXTENSION vector`는 migration 전용 계정 또는 RDS extension 생성 권한이 있는 계정으로 실행한다.
- destructive migration은 금지하고, column/table 삭제가 필요한 변경은 expand-and-contract 방식으로 나눈다.
- 배포 전 snapshot을 만들고, migration 실패 시 애플리케이션 롤백과 DB 복구 절차를 분리해서 판단한다.

## 2.6 보안과 설정 계약

### 2.6.1 HTTPS, Cookie, CORS

- 운영 환경은 HTTPS만 허용한다.
- refresh token cookie는 `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/v1/auth`를 사용한다.
- frontend domain과 API domain이 분리될 경우 CORS allow origin은 CloudFront frontend domain만 허용한다.
- 운영에서 wildcard CORS는 사용하지 않는다.
- CloudFront viewer certificate는 `us-east-1` ACM 인증서를 사용한다.
- ALB listener certificate는 ALB 리전의 ACM 인증서를 사용한다.
- 필요 시 CloudFront response headers policy로 HSTS, X-Content-Type-Options, Referrer-Policy를 설정한다.

### 2.6.2 Secrets Manager 항목

| Secret | 사용 서비스 | 예시 키 |
|--------|-------------|---------|
| DB credential | Spring Boot, FastAPI 선택 | `username`, `password`, `host`, `port`, `database` |
| JWT signing secret | Spring Boot | `jwtSigningKey` |
| refresh token pepper | Spring Boot | `refreshTokenPepper` |
| email encryption key ref | Spring Boot | `emailKeyId`, `emailKeyMaterial` 또는 KMS key ref |
| OpenAI API key | FastAPI | `OPENAI_API_KEY` |
| Notion/MCP secret | Spring Boot/FastAPI | provider별 token 또는 external secret ref |

규칙:

- secret 원문은 Git, Docker image, CloudWatch log, job payload, Agent/MCP log에 남기지 않는다.
- 운영 DB에는 외부 provider secret 원문 대신 Secrets Manager ARN 또는 내부 암호문 참조만 저장한다.
- KMS key rotation과 기존 암호문 재암호화 전략은 운영 베타 전 확정한다.
- ECS task definition의 `secrets`로 주입한 값은 task 시작 시점에 container 환경 변수로 들어간다. secret rotation 이후에는 service force new deployment 또는 task 재시작이 필요하다.
- JSON key 단위로 Secrets Manager 값을 주입하려면 Fargate Linux platform version `1.4.0` 이상을 사용한다.
- task execution role은 ECR image pull, CloudWatch Logs, Secrets Manager read 권한을 갖고, application task role은 애플리케이션이 실제로 호출하는 AWS API 권한만 갖도록 분리한다.
- 환경 변수는 container 내부와 일부 debugging tool에서 읽힐 수 있으므로, 장기적으로 고민감 secret은 애플리케이션이 AWS SDK로 런타임 조회하는 방식을 검토한다.

## 2.7 배포 절차

### 2.7.1 최초 구축

1. Route 53 또는 기존 DNS에서 frontend/API 도메인을 준비한다.
2. ACM에서 CloudFront용 인증서는 `us-east-1`, ALB용 인증서는 ALB 리전에 발급한다.
3. VPC, subnet, security group을 생성한다.
4. private subnet ECS task의 AWS API 접근을 위해 NAT Gateway 또는 필요한 VPC endpoint를 준비한다.
5. RDS PostgreSQL을 private subnet에 생성하고 pgvector extension 지원 여부를 확인한다.
6. RDS parameter, backup retention, storage encryption, deletion protection 설정을 확인한다.
7. ECR repository를 backend, ai-server용으로 생성한다.
8. Secrets Manager에 DB, JWT, pepper, AI provider secret을 등록한다.
9. ECS cluster, task definition, service를 backend와 ai-server 각각 생성한다.
10. Spring Boot는 public ALB target group에 연결하고, FastAPI는 내부 service discovery로 연결한다.
11. S3 bucket은 Block Public Access를 켜고 CloudFront OAC bucket policy를 적용한다.
12. CloudFront distribution을 생성하고 frontend build output을 업로드한다.
13. CloudWatch Logs group과 retention을 설정한다.

### 2.7.2 애플리케이션 배포

1. backend와 ai-server Docker image를 build한다.
2. image를 immutable tag로 ECR에 push한다.
3. DB migration을 one-off ECS task 또는 CI/CD migration step으로 먼저 실행한다.
4. ECS task definition의 image tag와 secret ARN/key 참조를 갱신한다.
5. ECS service를 rolling update한다.
6. frontend를 build하고 versioned S3 prefix 또는 release artifact로 업로드한다.
7. CloudFront invalidation을 수행한다.
8. smoke check를 실행한다.

### 2.7.3 수동 롤백

- Backend/API 장애: 직전 정상 task definition revision으로 ECS service를 업데이트한다.
- AI Server 장애: 직전 정상 ai-server task definition revision으로 ECS service를 업데이트한다.
- Frontend 장애: 직전 S3 build artifact를 재업로드하거나 versioned bucket/object 기준으로 CloudFront origin path를 되돌린다.
- DB migration 장애: MVP에서는 destructive migration을 금지하고, 배포 전 RDS snapshot을 생성한다. 이미 적용된 migration은 즉시 되돌리기보다 backward-compatible fix-forward를 우선 검토한다.
- secret rotation 장애: 이전 secret version으로 staging label을 되돌린 뒤 ECS service force new deployment를 수행한다.

## 2.8 실패 모드와 위험 제어

| 실패 모드 | 위험 | 제어 |
|----------|------|------|
| ECS task health check 실패 | API/AI service 배포 불가 | `/api/health`, `/health`를 최소 의존성으로 유지하고 CloudWatch event 확인 |
| RDS 연결 실패 | 로그인/게시글/검색 전체 실패 | security group, subnet, secret rotation 값을 배포 체크리스트에 포함 |
| pgvector extension 누락 | Memory Search 실패 | migration smoke에서 extension과 vector index 존재 확인 |
| private S3 origin/OAC 설정 오류 | CloudFront에서 frontend asset 403 | S3 direct access 차단과 CloudFront asset 로드 둘 다 smoke check |
| CORS/cookie 설정 오류 | 로그인은 성공해도 세션 유지 실패 | 운영 domain 기반 CORS, `Secure` cookie, SameSite 검증 |
| FastAPI를 public으로 열어둠 | 내부 AI endpoint 남용 또는 인증 우회 위험 | 기본은 private service, public 노출 시 별도 인증/rate limit 설계 |
| NAT/VPC endpoint 누락 | ECS task image pull, secret 조회, 로그 전송, 외부 AI 호출 실패 | private subnet egress와 endpoint 체크를 최초 구축 항목에 포함 |
| secret rotation 미반영 | 새 secret 발급 후에도 task가 이전 값 사용 | rotation 후 ECS force new deployment 또는 런타임 secret 조회 |
| backward-incompatible migration | 배포 롤백 후 구버전 앱이 새 DB schema와 충돌 | expand-and-contract migration, 배포 전 snapshot |
| 외부 AI API 장애 | embedding/summary 실패 | 게시글 CRUD는 유지하고 `failed` 상태와 재시도 가능성 노출 |
| secret 로그 유출 | 개인정보/외부 API key 위험 | structured logging에서 secret masking, 원문 prompt/token 저장 금지 |
| 비용 초과 | 학습/MVP 환경 유지 부담 | NAT Gateway, RDS instance size, log retention, AI 호출량을 별도 비용 점검 항목으로 관리 |

## 2.9 관측성과 운영 체크

MVP 기본 관측성:

- CloudWatch Logs: Spring Boot, FastAPI, ECS task logs
- ECS metrics: CPU, memory, desired/running task count
- ALB metrics: 5xx, target response time, unhealthy host count
- RDS metrics: CPU, connection count, free storage, read/write latency
- Application logs: request id, user id hash 또는 internal user id, endpoint, status, latency
- CloudWatch log retention은 무기한 보존 대신 MVP 기준 기간을 명시한다. 예: 14일 또는 30일.
- Spring Boot에서 FastAPI로 넘기는 내부 호출에는 correlation id를 전달한다.

MVP 알람 후보:

- ALB 5xx count 증가
- ECS running task count가 desired count보다 낮음
- RDS CPU 또는 connection count 임계치 초과
- RDS free storage 부족
- FastAPI AI provider error rate 증가
- Secrets Manager rotation 이후 ECS task 재시작 누락
- CloudFront 4xx 급증

## 2.10 검증 전략

배포 후 smoke check:

1. CloudFront frontend URL 접속
2. `GET https://api.<domain>/api/health`
3. 내부 FastAPI `GET /health` 확인. 기본 구성에서는 public API domain으로 FastAPI health를 노출하지 않는다.
4. 회원가입 → 로그인 → refresh token cookie 설정 확인
5. 게시글 작성 → 게시글 목록/상세 조회
6. memory status 조회
7. Memory Search 실행
8. AI 요약 실행
9. 로그아웃 후 refresh token 재사용 실패 확인
10. S3 object direct URL은 차단되고 CloudFront URL로는 asset이 로드되는지 확인
11. ECS service rolling update 후 데이터 유지 확인
12. secret rotation 또는 secret version 변경 후 ECS force new deployment 절차 확인

문서 검증:

- API 명세([`../01-design/API_SPEC.md`](../01-design/API_SPEC.md))의 base URL, cookie, CORS 규칙과 이 문서가 일치해야 한다.
- ERD([`../01-design/ERD.md`](../01-design/ERD.md))의 secret 저장 원칙과 Secrets Manager/KMS 사용 방식이 충돌하지 않아야 한다.
- 요구사항([`../00-product/REQUIREMENTS.md`](../00-product/REQUIREMENTS.md))의 수용 기준에 배포 smoke check가 반영되어야 한다.

## 2.11 구현 메모 (Track B)

- Dockerfile, health endpoint, environment variable 이름은 실제 코드가 생긴 뒤 확정한다.
- Terraform/CDK는 후속 자동화 후보로 둔다.
- staging/prod 분리, blue/green 배포, WAF, 상세 비용 알람은 운영 베타 단계에서 확장한다.
- 로컬 Docker 실행과 기본 smoke는 Part 1(Track A)에서 관리하고, Part 2는 AWS 고유 결정만 유지한다.

## 2.12 열린 질문 (Track B)

- 실제 도메인 이름과 DNS 제공자는 구현 후 배포 직전에 확정한다.
- embedding provider/model은 구현 전 확정한다. (vector dimension은 1536으로 고정 — 작업지시서 R7 / 추적 로그 D8)
- Spring Boot와 FastAPI 중 어느 서비스가 `memory_chunks`, `memory_embeddings`, `async_jobs`를 최종 생성/갱신할지는 아키텍처 기준 Spring Boot로 확정(아키텍처 §13).
- NAT Gateway 비용을 감수할지, 학습/MVP 계정에서는 단순 outbound 구성을 사용할지 배포 환경별로 결정한다(추적 로그 D17).

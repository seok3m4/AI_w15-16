# 로컬 Docker 실행 설계 — Memento MVP (Track A)

## 1. 문서 목적

이 문서는 Memento MVP를 AWS 없이 로컬 PC에서 Docker 기반으로 실행하기 위한 Track A 배포/실행 설계다.

목표는 1~2일 안에 팀원이 전체 시스템 실행 흐름을 파악하고, 기능 구현 후 동일한 명령으로 MVP smoke scenario를 확인할 수 있게 만드는 것이다. AWS ECS/RDS/S3 배포는 Track B인 `docs/DEPLOYMENT_AWS_MVP.md`에서 다룬다.

현재 저장소는 기획/설계 문서 중심이며 실제 `backend/`, `ai-server/`, `frontend/`, `docker-compose.yml` 구현은 후속 작업이다. 이 문서는 해당 파일들을 만들 때 따라야 할 실행 계약을 고정한다.

## 2. 목표 결과

- `docker compose up --build`로 PostgreSQL/pgvector, Spring Boot, FastAPI, React를 함께 실행한다.
- 로컬 데이터는 Docker volume에 유지한다.
- 로컬에서는 HTTPS 없이 실행하며, refresh token cookie의 `Secure` 속성은 예외 처리할 수 있다.
- AI provider는 mock mode를 기본값으로 둘 수 있고, 실제 OpenAI API는 환경 변수로 전환한다.
- 회원가입, 로그인, 게시글 작성, memory status, Memory Search, AI 요약 smoke check를 로컬에서 먼저 통과시킨다.
- Track A smoke가 안정화된 뒤 Track B AWS 배포로 넘어간다.

## 3. 선택한 범위

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

## 4. 로컬 아키텍처

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

## 5. Compose 서비스 계약

후속 구현의 `docker-compose.yml`은 최소한 다음 서비스를 포함한다.

### 5.1 postgres

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

### 5.2 backend

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

### 5.3 ai-server

- FastAPI AI service를 실행한다.
- local 기본값은 mock provider다.
- 실제 provider를 사용할 때만 `OPENAI_API_KEY`를 넣는다.

필수 env:

```text
AI_PROFILE=local
AI_PROVIDER=mock
OPENAI_API_KEY=
```

### 5.4 frontend

- Vite dev server를 실행한다.
- container 내부에서 backend API를 직접 호출하지 않고, 브라우저 기준 URL을 사용한다.

필수 env:

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## 6. 실행 절차

### 6.1 최초 실행

```bash
cp .env.example .env.local
docker compose --env-file .env.local up --build
```

구현 전에는 위 명령이 목표 계약이다. 실제 파일 작성 시 Windows PowerShell에서도 동작하도록 명령을 별도 검증한다.

### 6.2 재실행

```bash
docker compose --env-file .env.local up
```

### 6.3 데이터 초기화

```bash
docker compose down
docker volume rm <project>_postgres_data
docker compose --env-file .env.local up --build
```

데이터 초기화 명령은 로컬 개발 전용이다. 공유 DB나 AWS RDS에는 사용하지 않는다.

## 7. 로컬 보안 기준

- `.env.local`, `.env`, 실제 API key 파일은 Git에 커밋하지 않는다.
- 로컬 기본 password와 JWT key는 개발용이며 운영에 재사용하지 않는다.
- `COOKIE_SECURE=false`는 로컬 HTTP 전용이다. AWS Track B에서는 반드시 `true`다.
- `AI_PROVIDER=mock`일 때는 외부 API 호출과 비용이 발생하지 않아야 한다.
- 실제 OpenAI API key를 넣은 경우 로그에 prompt, token, key 원문을 출력하지 않는다.

## 8. 관측성과 로그

로컬 기본 확인:

- `docker compose ps`
- `docker compose logs backend`
- `docker compose logs ai-server`
- `docker compose logs postgres`

로그에 포함할 것:

- request id 또는 correlation id
- endpoint, status, latency
- memory job status
- AI provider mode: `mock` 또는 `real`

로그에 포함하지 않을 것:

- refresh token 원문
- OpenAI API key
- 사용자 게시글/댓글 원문 전체
- LLM prompt 원문 전체

## 9. 로컬 Smoke Check

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

## 10. 실패 모드와 대응

| 실패 모드 | 확인 지점 | 대응 |
|-----------|-----------|------|
| postgres health check 실패 | `docker compose logs postgres` | volume 권한, port 충돌, env 값을 확인한다. |
| backend DB 연결 실패 | backend logs, `DATABASE_URL` | service name이 `postgres`인지 확인한다. |
| frontend CORS 실패 | browser console, backend CORS 설정 | `FRONTEND_ORIGIN=http://localhost:5173`인지 확인한다. |
| cookie 저장 실패 | browser devtools | 로컬에서는 `COOKIE_SECURE=false`, path `/api/v1/auth`를 확인한다. |
| ai-server 호출 실패 | backend logs, `AI_SERVER_URL` | Docker network URL이 `http://ai-server:8000`인지 확인한다. |
| AI 비용 발생 우려 | ai-server logs, env | 기본값을 `AI_PROVIDER=mock`으로 둔다. |
| memory search 실패 | migration logs, DB extension | `vector` extension 생성 여부를 확인한다. |

## 11. Track B로 넘어가는 기준

AWS 배포를 시작하기 전 Track A에서 다음을 만족해야 한다.

- 로컬 Docker smoke check가 통과한다.
- migration이 새 DB에서도 재현 가능하다.
- Docker image build가 backend와 ai-server에서 성공한다.
- `.env.example`에 필수 설정이 문서화되어 있다.
- mock AI provider와 real provider 전환 방식이 확인되어 있다.
- 로그에 token, secret, prompt 원문이 남지 않는다.

## 12. 후속 구현 메모

- 실제 `docker-compose.yml`, Dockerfile, `.env.example`은 이 문서를 기준으로 작성한다.
- 개발 편의를 위해 backend, ai-server, frontend를 bind mount로 hot reload할지 여부는 구현 시 결정한다.
- CI에서 Track A smoke를 일부 자동화하려면 DB와 backend/ai-server health check부터 시작한다.

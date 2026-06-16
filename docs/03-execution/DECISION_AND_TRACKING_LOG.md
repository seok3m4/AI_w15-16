# 의사결정 · 진행 추적 · 회고 로그 (텍스트 Memory MVP)

> **용도**: 구현 간 ① 의사결정 기록(왜 이렇게 정했는가), ② 트랙별 진행 추적(지금 어디까지), ③ 단계별 회고·평가(무엇이 잘/안 됐나)를 한 곳에서 관리한다.
> **연계 문서**: [작업지시서(Work Order)](WORK_ORDER.md) — 트랙 매핑·진행 순서·충돌 규칙·단계별 작업의 단일 출처.
> **갱신 규율**: 결정이 생기거나 바뀌면 Part A, 작업 상태가 바뀌면 Part B, 단계가 끝나면 Part D를 그때그때 갱신한다.

---

## Part A. 의사결정 기록 (ADR-lite)

각 결정은 `결정 / 근거 / 대안 / 영향 / 상태 / 날짜`로 기록한다. 상태: `확정` · `보류(단계 진입 시 결정)` · `번복`.

### A-1. 착수 전 확정 결정 (협업·구조) — 2026-06-16 확정

| ID | 결정 | 근거 | 버린 대안 | 영향 |
|----|------|------|-----------|------|
| D0 | 팀(세션)을 **기능별 세로 트랙 6개**로 분리, 단 1단계는 INFRA-0·auth 선작업 | 도메인 폴더 소유 = 충돌 최소화, 인수인계 비용 축소 | 레이어별(BE/FE/AI) 분리 → 같은 서비스 공유로 내부 충돌 증가 | 트랙 매핑 전체 |
| D1 | 트랙마다 **소유 폴더(도메인) 배정** | 파일 소유 경계로 충돌 차단 | 자유 편집 → 충돌 빈발 | 전 트랙 |
| D2 | **package-by-feature** 코드 구조 | Task당 자기 폴더만 편집 | layer-by-type → 기능마다 여러 폴더 동시 편집 | 전 BE/FE |
| D3 | DB 마이그레이션 **timestamp 파일명** + out-of-order | 동시 추가 시 번호 충돌 제거 | 순번/버전 대역 분할, 스키마 오너 단일화 | P0-INFRA-5 이후 전 BE |
| D4 | **Security 설정 분해**(중앙 골격 최소, 세부 인가는 기능 패키지) | 인가 파일 동시 편집 제거 | 단일 SecurityFilterChain | auth + 이후 전 BE |
| D5 | 라우팅 **기능별 자체 등록** | 중앙 라우트 파일 충돌 제거 | 중앙 집중 라우트 테이블 | FE 전 트랙 |
| D6 | FE-BE 공유 타입 **BE 단일 출처** | 타입 중복 정의 충돌 제거 | FE 수기 중복 | FE-BE 계약면 |
| D7 | **trunk-based + 작은 PR + 매일 머지** | 브랜치 수명 단축 → 충돌 표면적 축소 | 장수명 feature 브랜치 | 전 트랙 통합 |
| D8 | **embedding 벡터 차원 = 1536** 지금 고정 | 차원은 DB 컬럼/스키마에 박힘, 후행 변경 시 재색인 | provider 확정까지 미루기 | P1-AI-1, P1-BE-5/6 |
| D9 | **pgvector 인덱스는 P4로 지연**, 스키마(차원 포함)만 P0 확정 | 초기 데이터 적음, 스키마만 안정화 | 초기부터 hnsw/ivfflat | P0-INFRA-5, P1-BE-6 |
| D18 | `memory_embeddings.embedding`은 nullable, `succeeded` 상태에서만 필수 | P1에서 pending/running/failed embedding row를 같은 테이블로 추적해야 함 | pending은 `async_jobs`/`posts.memory_status`에만 저장, 결과 전용 테이블 분리 | P0-INFRA-5, P1-BE-4~6 |
| D19 | Auth 암호화/lookup pepper local dev 기본값은 `application-local.yml`에만 둔다 | base profile에 dev key가 있으면 운영 env 누락을 놓칠 수 있음 | `application.yml`에 fallback 기본값 유지 | P0-BE-1, 배포 설정 |
| D10 | 인증 방식은 **Bearer access JWT + HttpOnly refresh token rotation**으로 확정 | FE 계약과 API 명세가 access token은 `Authorization: Bearer`, refresh token은 cookie+rotation을 전제함. refresh token 원문은 저장하지 않고 HMAC hash만 저장 | 서버 세션 쿠키 단일 방식 | P0-BE-2, P0-BE-3, P0-FE-1 |
| D11 | embedding provider/model은 **mock + OpenAI `text-embedding-3-small`**, 내부 endpoint는 `POST /internal/v1/embeddings` | `text-embedding-3-small` 기본 차원이 D8의 1536과 일치하고, mock은 로컬/테스트 비용을 없애며 OpenAI provider는 P1에서 실제 통합 smoke를 가능하게 함 | mock만 구현하고 real provider를 P4로 지연 | P1-AI-1, P1-BE-4~6, P4-X-2 |
| D20 | P1-BE-3 worker는 **등록된 handler type만 claim**하고 기본 `stale-timeout=60s`, `default-max-attempts=3`으로 둔다 | T6 공통 큐가 T3 embedding handler 없이도 안전하게 배포되어야 하며, 미지원 job을 선점하면 후속 트랙 작업을 막을 수 있음 | worker가 모든 pending job을 claim하거나 P1-BE-3에서 embedding 호출까지 포함 | P1-BE-3, P1-BE-4~7, P3-BE-5~13 |

### A-2. 후행 결정 (해당 단계 진입 직전, 담당 트랙이 결정) — 상태: 보류

| ID | 결정 항목 | 담당 트랙 | 차단 단계 | 권장 기본값 | 상태 |
|----|-----------|-----------|-----------|-------------|------|
| D12 | stale memory 보존 기간 | T3 | P1 | 예: 30일 | 보류 |
| D13 | Capsule compact context JSON 구조 | T5 | P2 | `purpose,summary,keyFacts[],sourcePostIds[],tags[]` | 보류 |
| D14 | 친구 AI 동의 철회 후 기존 Capsule/Agent 결과 정책 | T5 | P3 | 신규 사용 차단 + 기존 산출물 출처 무효 표시 | 보류 |
| D15 | Agent 최대 step·시간·retry 한도 | T6/T4 | P3 | step≤8, 60s, retry≤1 | 보류 |
| D16 | MCP 인증·scope 모델, credential 형식 | T6 | P3 | scope enum + 발급/폐기 토큰 | 보류 |
| D17 | AWS 도메인·Route 53·NAT 비용 범위 | T6 | P4 | 배포 직전 결정 | 보류 |

### A-3. 결정 변경 이력

> 결정이 번복·수정되면 여기에 날짜·사유와 함께 추가한다. (현재 없음)

| 날짜 | 대상 ID | 변경 내용 | 사유 |
|------|---------|-----------|------|
| - | - | - | - |

---

## Part B. 트랙별 진행 추적

각 트랙이 작업 시작/완료 시 갱신한다. 상태: `대기` · `진행` · `완료` · `차단(blocked)`.

### T1 · Auth
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| P0-INFRA(공동) | INFRA-0 + 스키마 베이스라인(차원 1536) | 대기 | | | T6와 공동 |
| P0-BE-1 | users 모델 + 회원가입 API | 완료 | sjin | | 2026-06-16: `POST /api/v1/auth/signup` 구현. 단위 테스트와 로컬 HTTP smoke 통과. 보완: auth crypto fallback은 local profile로 격리하고 base profile은 env 필수값으로 변경. |
| P0-BE-2~3 | 로그인·인증필터 | 완료 | | | 2026-06-16: P0-BE-2 완료. `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, access JWT, HttpOnly refresh cookie, refresh token HMAC 저장·rotation·reuse family revoke 구현. 2026-06-16: P0-BE-3 완료. Bearer access JWT 검증 필터, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` refresh session 폐기와 cookie clear 구현. `backend\\gradlew.bat test` 통과. |
| P0-FE-1 | 인증 화면·토큰 흐름·FE 공통 클라이언트 | 완료 | | | 2026-06-16: `/login`, `/signup`, `/app` 보호 라우트, access token `sessionStorage`, HttpOnly refresh cookie 기반 401 재발급 1회 재시도, logout, 공통 API client 구현. `npm run test`, `npm run build` 통과. 2026-06-16: `memento-style-preview.html` 기준 보정 반영(SNB collapse, 모바일 drawer, primary button icon treatment, motion primitives). |
| P2-BE-7 | 친구 AI 동의 toggle | 대기 | | | |

### T2 · Content
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| FE 공통 골격 | 디자인·라우트 집계·API 클라이언트(1단계) | 대기 | | | |
| P0-BE-4~7 | 게시물 CRUD·소유권 | 진행 | | | 2026-06-16: P0-BE-4 완료. `POST /api/v1/posts` 구현, 제목·본문으로 게시물 생성 및 `memory_status=pending` 반환. `tagNames`는 optional 요청 호환성과 중복 정리까지만 처리하고 실제 태그 저장은 P0-BE-10에서 진행. memory chunk/embedding job 연결은 P1-BE-4에서 진행. |
| P0-BE-8~11 | 댓글·태그 | 대기 | | | |
| P0-BE-12~13, P0-FE-2~5 | 페이징·검색·화면 | 대기 | | | |
| P2-BE-6 | 친구 범위 검색 확장 | 대기 | | | |

### T3 · Memory
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| P1-BE-1~2 | memory chunk 파이프라인 | 대기 | | | |
| P1-BE-4~7 | embedding 저장·상태·검색 기반 | 대기 | | | 작업큐(T6)·embedding(T4) 의존 |
| P1-BE-8~9, P1-FE-1 | Memory Search·화면 | 대기 | | | |

### T4 · AI
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| P1-AI-1 | embedding endpoint(mock→real, 차원 1536) | 완료 | | | 2026-06-16: FastAPI `POST /internal/v1/embeddings` 구현. `AI_PROVIDER=mock` deterministic 1536차원 vector와 `AI_PROVIDER=openai`(`text-embedding-3-small`) provider 호출, 검증 실패 400/ provider 실패 502 처리 추가. `cd ai-server && python -m pytest` 통과. |
| P2-AI-1~2 | 요약·Capsule 보조 생성 | 대기 | | | |
| P3-AI-1~2 | Agent graph·Notion Client | 대기 | | | |
| P4-X-2 | provider 전환·관측성 | 대기 | | | |

### T5 · Social
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| P2-BE-2~5 | 친구 관계·좋아요·친구 게시물 | 대기 | | | |
| P2-BE-8~10, P2-AI-2 연계 | 본인 Capsule | 대기 | | | |
| P2-FE-2~3 | 친구·Capsule 화면 | 대기 | | | |
| P3-BE-1~4, P3-FE-1 | 친구 AI 게이트·Search·선물·친구 Capsule | 대기 | | | T1 동의·T3 벡터 의존 |

### T6 · Platform
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| INFRA-0(P0-INFRA-1~5) | 스캐폴딩·compose·DB·health·마이그레이션 | 진행 | | | P0-INFRA-1 완료. P0-INFRA-2 완료: PostgreSQL+pgvector compose 및 `CREATE EXTENSION vector` 초기화 추가, `pg_extension` vector 조회와 vector 캐스팅 검증 통과. 검토 반영: 병렬 compose 실행을 위해 고정 `container_name` 제거. P0-INFRA-3 완료: Spring Boot `/api/health`, FastAPI `/health` 200 반환. P0-INFRA-4 완료: `.env.example` 및 서비스별 환경 변수 로딩 추가, `docker compose --env-file .env.local up -d`로 postgres/backend/ai-server/frontend 4개 서비스 동시 기동과 backend·ai-server health, frontend 200 응답 검증. P0-INFRA-5 완료: Spring Boot Flyway/PostgreSQL 의존성 및 timestamp baseline migration 추가, P0/P1 핵심 테이블과 `memory_embeddings.embedding vector(1536)` 생성 검증 통과. 보완: D18에 따라 `embedding` nullable + `succeeded` 상태 필수 제약 follow-up migration 추가. T1과 공동 |
| P1-BE-3 | async_jobs 작업큐·worker | 완료 | | | 2026-06-16: `feature/jobs` 공통 큐 구현. `async_jobs` attempt 제한 migration 추가, enqueue/find/claim/succeed/fail-or-retry/timeout recovery와 handler 기반 worker 골격 구현. 아직 REST polling API와 embedding handler는 P1-BE-4~7에서 연결. `backend\\gradlew.bat test` 통과. |
| P3-BE-5~8 | Agent tool·실행·승인 게이트 | 대기 | | | |
| P3-BE-9~13 | MCP Server/Client BE | 대기 | | | |
| P4 전체 | 이력 API·smoke·AWS 배포·문서 동기화 | 대기 | | | |

---

## Part C. 단계별 완료 게이트 체크

작업지시서 §3 완료 게이트와 요구사항 §11 수용 기준에 매핑된다.

- [ ] **INFRA-0**: `docker compose up`으로 4개 서비스 동시 기동 + health 통과
- [ ] **P0**: 가입·로그인 후 게시물 작성·댓글·태그·키워드 검색·페이징, 비인증/타인 데이터 차단
- [ ] **P1**: memory chunk·embedding 상태 생성/갱신, 자연어 Memory Search, embedding 실패가 CRUD 롤백 안 함
- [ ] **P2**: AI 요약(근거 포함), 본인 Capsule, 친구 상호 조회·댓글·좋아요, 비친구 차단
- [ ] **P3**: 친구 근거 답변(출처 포함), Agent tool 실행·이력, 외부 쓰기 승인 후 실행, MCP tool 호출
- [ ] **P4**: 승인·이력 UI, Track A·B smoke, 롤백, 문서 동기화

---

## Part D. 단계별 회고·평가 (단계 종료 시 작성)

각 단계가 끝나면 아래 템플릿을 복사해 채운다.

```
### 회고 — [단계명] (작성일: YYYY-MM-DD)
- 잘된 점:
- 어려웠던 점:
- 실제 발생한 merge conflict (있다면 파일·원인·해결):
- 의사결정 변경/번복 (Part A-3에도 반영):
- 다음 단계 개선 액션:
```

### 멀티 세션 운영 평가 (전체 관점, 단계마다 누적)
구현이 진행되며 아래 질문에 근거와 함께 답한다.

- **병렬화 효과**: 트랙 분리가 실제로 충돌을 줄였는가? 충돌이 난 곳은 작업지시서 §2.3 공유 파일에 한정되었는가?
- **토대 선작업**: 1단계(INFRA-0·auth 선작업)가 이후 트랙의 병렬 출발을 실제로 가능하게 했는가?
- **통합 지점**: 작업지시서 §5 통합 지점에서 인터페이스 사전 합의가 충분했는가, 재작업이 있었는가?
- **결정 타이밍**: 후행 결정(D10~17)을 단계 진입 직전에 내린 것이 적절했는가, 더 일찍/늦게 냈어야 하는가?
- **세션 스케줄링**: 워크로드 시차(P0=T1·T2, P3=T4·T5·T6)에 따른 세션 재배치가 효과적이었는가?

> 이 평가는 향후 실제 팀 협업 시 프로세스 개선의 근거로 사용한다.

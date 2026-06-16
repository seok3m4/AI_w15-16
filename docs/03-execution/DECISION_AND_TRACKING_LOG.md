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
| D12 | stale memory 보존 기간 | T3 | P1 | 수정된 chunk는 `stale`로 30일 보존, 삭제된 게시물 chunk는 즉시 `deleted` 처리해 검색 제외 | 확정 |
| D13 | Capsule compact context JSON 구조 | T5 | P2 | `purpose,summary,keyFacts[],sourcePostIds[],tags[]` | 보류 |
| D14 | 친구 AI 동의 철회 후 기존 Capsule/Agent 결과 정책 | T5 | P3 | 신규 사용 차단 + 기존 산출물 출처 무효 표시 | 보류 |
| D15 | Agent 최대 step·시간·retry 한도 | T6/T4 | P3 | step≤8, 60s, retry≤1 | 확정 |
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
| P2-BE-7 | 친구 AI 동의 toggle | 완료 | | | 2026-06-16: `PUT /api/v1/privacy/ai-sharing` 구현. `user_privacy_settings.friend_ai_sharing_enabled`를 active user 범위에서 upsert하고 `updated_at`을 갱신하며, P3 친구 AI 게이트가 재사용할 `AiSharingConsentReader` read port를 추가. 기본값 false는 기존 signup/default schema를 유지. `cd backend; .\gradlew.bat --no-daemon --no-watch-fs compileJava` 통과. focused privacy/auth test 실행은 unrelated `feature/embedding`, `feature/jobs`, `feature/memory` test compile 오류로 `compileTestJava` 단계에서 차단됨. |

### T2 · Content
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| FE 공통 골격 | 디자인·라우트 집계·API 클라이언트(1단계) | 대기 | | | |
| P0-BE-4~7 | 게시물 CRUD·소유권 | 완료 | | | 2026-06-16: P0-BE-4 완료. `POST /api/v1/posts` 구현, 제목·본문으로 게시물 생성 및 `memory_status=pending` 반환. `tagNames`는 optional 요청 호환성과 중복 정리까지만 처리하고 실제 태그 저장은 P0-BE-10에서 진행. memory chunk/embedding job 연결은 P1-BE-4에서 진행. 2026-06-16: P0-BE-5 완료. `GET /api/v1/posts` 기본 `scope=me` 목록과 `GET /api/v1/posts/{postId}` 본인 상세 조회 구현. 타 사용자/삭제 게시물은 404로 숨김. 2026-06-16: P0-BE-6~7 완료. `PUT`/`DELETE /api/v1/posts/{postId}`는 작성자 조건으로만 수정·soft delete하고, 타 사용자/삭제/미존재 게시물은 `POST_NOT_FOUND` 404로 숨김. `PostRepository` 공개 계약에서 owner 없는 `findById`를 제거해 조회·변경 경로가 current user scope를 거치도록 보강. `cd backend; .\gradlew.bat --no-daemon test` 통과. |
| P0-BE-8~11 | 댓글·태그 | 진행 | | | 2026-06-16: P0-BE-8 완료. `POST /api/v1/posts/{postId}/comments` 구현. 로그인 사용자가 본인 게시물에만 댓글을 작성할 수 있고, 비소유/삭제 게시물은 `POST_NOT_FOUND` 404로 은닉. `feature/comment` 패키지에 controller/service/repository/exception handler 추가, JDBC `INSERT ... SELECT`로 게시물 소유권을 저장 시점에 강제. `CommentControllerTest`, `CommentCreateServiceTest`, `JdbcCommentRepositoryTest` 추가 및 `cd backend && .\\gradlew.bat --no-daemon test --tests "com.memento.feature.comment.*"` 검증 통과. 2026-06-16: P0-BE-10 완료. `POST /api/v1/posts` 생성 시 `tagNames`를 사용자별 `tags`/`post_tags`로 upsert·연결하고, 중복 태그명은 `normalized_name` 기준으로 하나로 정리. 생성·목록·상세 조회 응답의 `tags` 배열에 저장 태그 반환. 2026-06-16: P0-BE-11 완료. `GET /api/v1/tags?page&size` 구현. 로그인 사용자의 `tags.owner_id` 범위로 태그를 조회하고, 삭제되지 않은 게시글 연결만 `postCount`에 반영하며 `items/page` 응답을 반환. `TagControllerTest`, `TagQueryServiceTest`, `JdbcTagRepositoryTest` 추가. 2026-06-16 게이트 재검증: `cd backend; .\\gradlew.bat --no-daemon test --tests "com.memento.feature.post.*"` 및 `cd backend; .\\gradlew.bat --no-daemon test` 통과. P0-BE-13 검색 연동은 대기. |
| P0-BE-12~13, P0-FE-2~5 | 페이징·검색·화면 | 완료 | | | 2026-06-16: P0-FE-2 착수. `/app`, `/app/posts/new`, `/app/posts/{postId}`, `/app/posts/{postId}/edit`를 게시글 CRUD API에 연결하고 P0-FE-3~5 범위(댓글 CRUD, 태그 자동완성, 키워드 검색)는 분리 유지. 2026-06-16: P0-FE-2 완료. 홈 피드·작성·상세·수정·삭제 화면 및 post API client 연결, 태그는 표시/기존값 보존만 처리. `cd frontend; npm run test`, `npm run build` 통과. 2026-06-16: P0-FE-3 완료. `GET /api/v1/posts/{postId}/comments` 목록 API 보완 후 상세 화면 댓글 조회·작성·수정·삭제 UI와 `commentCount` 갱신을 연결. 품질 검증 반영으로 댓글 20개 초과 시 `더 불러오기` 버튼으로 다음 page를 조회하도록 보강. `cd backend; .\gradlew.bat --no-daemon test`, `cd frontend; npm run test`, `cd frontend; npm run build` 통과. 2026-06-16: P0-FE-4 완료. `GET /api/v1/tags?page=0&size=50` 기반 기존 태그 후보 조회, 작성/수정 화면 태그 추가·제거 UI, `POST`/`PUT /api/v1/posts`의 `tagNames` 전달을 구현. 2026-06-16 게이트 재검증: `cd frontend; npm run test -- --run App.test.tsx`, `cd frontend; npm run test`, `cd frontend; npm run build` 통과. Track A 최신 컨테이너 재빌드 후 health 3종 200 및 API smoke(회원가입 201, 로그인 200, 게시물 생성 201, 목록/상세 200, 수정 200, 삭제 204, 삭제 후 상세 404) 통과. Browser 플러그인 도구 미노출로 실제 브라우저 클릭 smoke는 미수행. 2026-06-16: P0-BE-12 완료. `GET /api/v1/posts` 목록 페이징 응답의 `page/size/totalCount/totalPages` 경계 테스트를 보강하고, P0-BE-13 전까지 `q`/`tag` 검색 조건은 `INVALID_POST_QUERY`로 거부하도록 명시. `cd backend; .\gradlew.bat --no-daemon test --tests "com.memento.feature.post.*"` 및 `cd backend; .\gradlew.bat --no-daemon test` 통과. 2026-06-16: P0-BE-13 완료. `GET /api/v1/posts?q=...&tag=...&scope=me`가 본인 게시물 범위에서 제목·본문·활성 댓글·태그명을 검색하고 기존 페이지 메타를 반환하도록 구현. `q`는 trim 후 ILIKE 부분 검색, `tag`는 normalized exact 필터로 처리하며 `scope=friends/all_accessible`은 P2-BE-6 전까지 계속 거부. `cd backend; .\gradlew.bat --no-daemon test --tests "com.memento.feature.post.*"` 통과. 2026-06-16: P0-FE-5 완료. `/app/search` S-07 화면을 추가하고 홈 피드 검색창에서 `q` 기반으로 이동하도록 연결. `GET /api/v1/posts?q=...&tag=...&scope=me&page=...&size=20&sort=createdAt,desc` 요청을 FE API client에서 지원하고, 검색 결과/빈 결과/오류/이전·다음 페이지 UI를 구현. P2-BE-6 전까지 친구 범위 검색은 노출하지 않음. `cd frontend; npm run test -- --run App.test.tsx` 통과. |
| P0-BE-13 품질 보완 | 댓글 본문 검색 smoke 회귀 수정 | 완료 | | | 2026-06-16: Track A에서 댓글 본문 `q` 검색이 PostgreSQL nullable parameter 타입 추론 실패로 500을 반환하던 문제를 `varchar` 명시 캐스팅으로 수정. `JdbcPostRepositoryTest` 회귀 테스트와 검색 포함 Track A 댓글 smoke 통과. |
| P0-BE-9 | 댓글 수정·삭제 권한 검증 | 완료 | | | 2026-06-16: `PUT /api/v1/comments/{commentId}`, `DELETE /api/v1/comments/{commentId}` 구현. 댓글 작성자만 활성 댓글을 수정·soft delete할 수 있고, 부모 게시글이 삭제됐거나 댓글이 미존재/삭제/타인 소유이면 `COMMENT_NOT_FOUND` 404로 은닉. `cd backend; .\gradlew.bat --no-daemon test --tests "com.memento.feature.comment.*"` 통과. |
| P2-BE-6 | 친구 범위 검색 확장 | 완료 | | | 2026-06-16: `GET /api/v1/posts?scope=friends&q=...&tag=...`와 `scope=all_accessible` 검색을 지원하도록 확장. 친구 범위는 accepted 관계만 포함하고, `all_accessible`은 본인+accepted 친구 게시물만 반환하며 비친구/삭제 게시물/삭제 댓글은 제외. 태그 검색은 게시글 작성자 namespace 기준으로 매칭. `cd backend; .\gradlew.bat --no-daemon --no-watch-fs test --tests "com.memento.feature.post.PostQueryServiceTest" --tests "com.memento.feature.post.JdbcPostRepositoryTest"` 통과. |

### T3 · Memory
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| P1-BE-1~2 | memory chunk 파이프라인 | 완료 | | | 2026-06-16: P1-BE-1 완료. 게시글 생성 후 `PostCreatedEvent`를 발행하고, AFTER_COMMIT 리스너가 `memory_chunks`에 제목·본문·태그 chunk를 `owner_id/post_id` 경계로 생성하도록 구현. 댓글 chunk와 수정/삭제 stale 처리는 후속 P1-BE-2 범위로 유지. `cd backend; .\gradlew.bat --no-daemon --no-watch-fs test` 통과. 2026-06-16: P1-BE-2 완료. 게시글 수정 성공 후 `PostUpdatedEvent`로 기존 active chunk를 `stale` 처리하고 최신 title/content/tag chunk와 `memory_reindex` pending embedding job을 `post_updated` reason으로 재생성. 게시글 삭제 성공 후 `PostDeletedEvent`로 해당 owner/post chunk를 `deleted` 처리해 검색 대상에서 제외. D12는 stale 30일 보존으로 확정. `cd backend; .\gradlew.bat --no-daemon --no-watch-fs test --tests "com.memento.feature.post.PostCommandServiceTest" --tests "com.memento.feature.memory.MemoryChunkCreateServiceTest" --tests "com.memento.feature.memory.JdbcMemoryChunkRepositoryTest" --tests "com.memento.feature.memory.MemoryPostEventListenerTest"` 통과. |
| P1-BE-4~7 | embedding 저장·상태·검색 기반 | 진행 | | | 2026-06-16: P1-BE-4 완료. 게시글 생성 AFTER_COMMIT memory chunk 생성 뒤 `memory_reindex` job을 enqueue하고 chunk별 `memory_embeddings` pending row(`embedding=NULL`, `job_id` 연결)를 생성하는 흐름 구현. FastAPI `POST /internal/v1/embeddings` 요청/응답 DTO와 client mapping을 추가하되, worker handler 등록·vector 저장·`posts.memory_status` 상태 전이는 P1-BE-5~7로 유지. `cd backend; .\gradlew.bat --no-daemon test` 통과. 2026-06-16: P1-BE-5 진행. `memory_reindex` worker handler를 등록해 FastAPI embedding 결과를 `memory_embeddings.embedding` pgvector로 저장하고 row/post 상태를 running/succeeded/failed로 전이하도록 구현. provider 일시 실패는 retryable job 실패로 넘기고, 실패 사유에는 원문 memory/provider 응답을 저장하지 않음. 구현 중 `cd backend; .\gradlew.bat --no-daemon compileJava`와 `cd backend; .\gradlew.bat --no-daemon test --tests "com.memento.feature.embedding.*"`가 한 차례 통과했으나, 현재는 병렬 comment/post/friend 변경의 미완 계약으로 `compileJava`/`compileTestJava`가 차단되어 후속 재검증 필요. |
| P1-BE-5 | embedding 저장·상태 관리 마무리 | 완료 | | | 2026-06-16: FastAPI embedding 내부 호출 `RestTemplate`에 `AI_EMBEDDING_CONNECT_TIMEOUT`(기본 2s), `AI_EMBEDDING_READ_TIMEOUT`(기본 15s) 기반 timeout을 적용하고 `EmbeddingConfigTest`로 red-green 확인. timeout 변경 직후 `EmbeddingConfigTest`는 통과했으나, 최신 재검증에서는 unrelated dirty `feature/post`의 `PostRepository`/`JdbcPostRepository` 시그니처 불일치로 `compileJava`가 차단됨. `com.memento.feature.embedding.*` 및 `DatabaseMigrationScriptTest`도 같은 외부 compile 차단 해소 후 재실행 필요. |
| P1-BE-7 | memory 상태 조회/재색인 API (GET /memory-status, POST /memories/reindex, GET /jobs/{jobId}) | 완료 | P1-BE-5, P1-BE-3 | | 2026-06-16: P1-BE-7 엔드포인트 추가 (`GET /api/v1/posts/{postId}/memory-status`, `POST /api/v1/memories/reindex`, `GET /api/v1/jobs/{jobId}`), 중복 재색인 방지/Job 상태 조회 로직 적용, 관련 dedupe 인덱스 migration 및 테스트 보강으로 `cd backend; .\\gradlew.bat --no-daemon test` 통과. |
| P1-BE-8~9, P1-FE-1 | Memory Search·화면 | 대기 | | | |

### T4 · AI
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| P1-AI-1 | embedding endpoint(mock→real, 차원 1536) | 완료 | | | 2026-06-16: FastAPI `POST /internal/v1/embeddings` 구현. `AI_PROVIDER=mock` deterministic 1536차원 vector와 `AI_PROVIDER=openai`(`text-embedding-3-small`) provider 호출, 검증 실패 400/ provider 실패 502 처리 추가. `cd ai-server && python -m pytest` 통과. |
| P2-AI-1 | 요약 생성(근거 chunk 기반, 근거 출처 포함) | 완료 | | | 2026-06-16: FastAPI `POST /internal/v1/memory-summaries` 구현. mock/OpenAI provider 전환, 입력 검증 400, provider 오류 502, source summary 포함 응답, OpenAPI 노출 확인까지 반영. `cd ai-server && python -m pytest` 통과. |
| P2-AI-2 | Capsule 보조 생성(summary/keyFacts/tags) | 완료 | | | 2026-06-16: FastAPI `POST /internal/v1/context-capsule-drafts` 구현. mock/OpenAI provider 전환, `purpose`/`sources` 입력 검증 400, provider 오류 502, `summary`·`keyFacts`·`tags` 구조화 응답, OpenAPI 노출 및 settings/env 기본값 추가 반영. `cd ai-server && python -m pytest -q` 통과. |
| P3-AI-1 | Agent graph + 표준 tool 결과/실패 형식 | 완료 | | | 2026-06-16: FastAPI `POST /internal/v1/agent-runs/execute` 구현. LangGraph `StateGraph` 기반 실행 래퍼, mock/OpenAI planner, Spring 내부 tool callback 계약(`/internal/v1/agent-tools/{toolName}`), `succeeded`/`failed`/`approval_required` 표준 응답, D15 한도(step≤8, 60s, retry≤1) 설정 반영. `cd ai-server && python -m pytest -q` 통과. |
| P3-AI-2 | Notion MCP Client | 대기 | | | P3-BE-7 승인 게이트 의존 |
| P4-X-2 | provider 전환·관측성 | 대기 | | | |

### T5 · Social
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| P2-BE-2~5 | 친구 관계·좋아요·친구 게시물 | 진행 | | | 2026-06-16: P2-BE-2 착수. `friendships` 요청/승인/거절 API를 우선 구현하고, 목록 조회·삭제/해제·친구 게시물·좋아요는 P2-BE-3~5로 분리 유지. 2026-06-16: P2-BE-2 완료. `POST /api/v1/friendships/requests`, `POST /api/v1/friendships/{friendshipId}/accept`, `POST /api/v1/friendships/{friendshipId}/reject` 구현. 자기 요청 400, 중복 pending/accepted 409, 대상/요청 없음 404, 수신자만 승인·거절 가능. `cd backend; .\gradlew.bat --no-daemon test --tests "com.memento.feature.friend.*"`, `cd backend; .\gradlew.bat --no-daemon test` 통과. 2026-06-16: P2-BE-3 완료. `GET /api/v1/friendships` 목록 조회와 `DELETE /api/v1/friendships/{friendshipId}` pending 취소/accepted 해제 구현. 검증은 friend 테스트 실행 시 기존 P2-BE-4 성격의 `PostQueryServiceTest` 미완성 변경 컴파일 오류로 차단되어 main compile까지만 확인. 2026-06-16: P2-BE-4 완료. `GET /api/v1/posts?scope=friends`, 친구 게시글 상세 조회, 친구 게시글 댓글 목록·작성 접근을 accepted friendship 기준으로 확장. `scope=friends`의 `q`/`tag` 검색과 `all_accessible`은 P2-BE-6까지 거부 유지. 집중 테스트와 `cd backend; .\gradlew.bat --no-daemon --no-watch-fs test` 통과. 2026-06-16: P2-BE-5 완료. `POST`/`DELETE /api/v1/posts/{postId}/likes` 구현. 작성자 또는 accepted 친구만 좋아요/취소 가능하고, 중복 좋아요와 없는 좋아요 취소는 멱등적으로 현재 `likedByMe`/`likeCount`를 반환. 비접근/삭제/미존재 게시물은 `POST_NOT_FOUND` 404로 은닉. `cd backend; .\gradlew.bat --no-daemon --no-watch-fs test --tests "com.memento.feature.like.*"` 통과. |
| P2-BE-8~10, P2-AI-2 연계 | 본인 Capsule | 대기 | | | |
| P2-FE-2~3 | 친구·Capsule 화면 | 대기 | | | |
| P3-BE-1~4, P3-FE-1 | 친구 AI 게이트·Search·선물·친구 Capsule | 대기 | | | T1 동의·T3 벡터 의존 |

### T6 · Platform
| Task | 설명 | 상태 | 브랜치 | 머지일 | 비고 |
|------|------|------|--------|--------|------|
| INFRA-0(P0-INFRA-1~5) | 스캐폴딩·compose·DB·health·마이그레이션 | 진행 | | | P0-INFRA-1 완료. P0-INFRA-2 완료: PostgreSQL+pgvector compose 및 `CREATE EXTENSION vector` 초기화 추가, `pg_extension` vector 조회와 vector 캐스팅 검증 통과. 검토 반영: 병렬 compose 실행을 위해 고정 `container_name` 제거. P0-INFRA-3 완료: Spring Boot `/api/health`, FastAPI `/health` 200 반환. P0-INFRA-4 완료: `.env.example` 및 서비스별 환경 변수 로딩 추가, `docker compose --env-file .env.local up -d`로 postgres/backend/ai-server/frontend 4개 서비스 동시 기동과 backend·ai-server health, frontend 200 응답 검증. P0-INFRA-5 완료: Spring Boot Flyway/PostgreSQL 의존성 및 timestamp baseline migration 추가, P0/P1 핵심 테이블과 `memory_embeddings.embedding vector(1536)` 생성 검증 통과. 보완: D18에 따라 `embedding` nullable + `succeeded` 상태 필수 제약 follow-up migration 추가. T1과 공동 |
| P1-BE-3 | async_jobs 작업큐·worker | 완료 | | | 2026-06-16: `feature/jobs` 공통 큐 구현. `async_jobs` attempt 제한 migration 추가, enqueue/find/claim/succeed/fail-or-retry/timeout recovery와 handler 기반 worker 골격 구현. 아직 REST polling API와 embedding handler는 P1-BE-4~7에서 연결. `backend\\gradlew.bat test` 통과. 2026-06-16 품질 보완: `completed_at` CASE expression의 PostgreSQL `timestamptz` 타입 추론 실패로 worker timeout recovery 로그가 주기적으로 에러를 내던 문제를 명시 캐스팅으로 수정. 회귀 테스트와 최신 backend 로그 확인 통과. |
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

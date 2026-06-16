# 개발 태스크 분해 — 텍스트 기반 Memory MVP

> **기준 산출물**:
> - 요구사항: [`docs/REQUIREMENTS_MVP_TEXT_MEMORY.md`](REQUIREMENTS_MVP_TEXT_MEMORY.md) (우선순위 §3, 기능 요구사항 §7, 데이터 §8, API 초안 §9, 수용 기준 §11)
> - API 명세: [`docs/API_SPEC_MVP_TEXT_MEMORY.md`](API_SPEC_MVP_TEXT_MEMORY.md)
> - ERD: [`docs/ERD_MVP_TEXT_MEMORY.md`](ERD_MVP_TEXT_MEMORY.md)
> - 아키텍처: [`docs/ARCHITECTURE_MVP_TEXT_MEMORY.md`](ARCHITECTURE_MVP_TEXT_MEMORY.md)
> - 화면 흐름도: [`docs/SCREEN_FLOW_MVP_TEXT_MEMORY.md`](SCREEN_FLOW_MVP_TEXT_MEMORY.md)
> - 프론트엔드 구현 계약서: [`docs/FRONTEND_IMPLEMENTATION_CONTRACT_MVP_TEXT_MEMORY.md`](FRONTEND_IMPLEMENTATION_CONTRACT_MVP_TEXT_MEMORY.md)
> - 배포: [`docs/DEPLOYMENT_LOCAL_DOCKER_MVP.md`](DEPLOYMENT_LOCAL_DOCKER_MVP.md), [`docs/DEPLOYMENT_AWS_MVP.md`](DEPLOYMENT_AWS_MVP.md)

---

## 1. 문서 목적

이 문서는 요구사항 §12의 5번 후속 산출물 **"개발 태스크 분해: P0 → P1 → P2 → P3 순서의 구현 단위 확정"** 을 충족한다.

기존 설계 산출물(요구사항/API/ERD/아키텍처/화면 흐름)을 실제 구현 실행 단위로 압축해, 팀이 코드 착수 직전 "무엇을 어떤 순서로 만들 것인가"를 풀스택 관점에서 고정한다.

### 1.1 적용 규칙

- **레이어 구분**: `FE`(React+Vite), `BE`(Spring Boot), `AI`(FastAPI), `INFRA`(Docker/DB/배포).
- **분해 단위**: Epic → Story → Task 3단계. 각 Task에는 완료 기준(DoD), 선행 의존성, 추적 링크(요구사항 ID / API path / 화면 ID)를 둔다.
- **Task ID 규칙**: `<우선순위>-<레이어>-<순번>` (예: `P0-BE-1`). 의존성은 다른 Task ID로 표기한다.
- **프론트엔드 단일 출처**: FE 화면/라우트 단위 분해는 [프론트엔드 구현 계약서](FRONTEND_IMPLEMENTATION_CONTRACT_MVP_TEXT_MEMORY.md)를 단일 출처로 삼는다. 본 문서의 FE 항목은 단계별 묶음과 BE/AI 통합 의존성만 요약한다.
- **권한 경계 원칙**(아키텍처 §2): 인증·소유권·친구 관계·AI 공유 동의·MCP scope 검증은 Spring Boot가 담당하고, embedding/요약/Agent 계산은 FastAPI가 담당한다.
- **결정 선행 플래그** `⚠️결정선행`: 요구사항 §13 또는 아키텍처 §11의 미결정 항목에 의존하는 Task. 해당 결정 전에는 완전히 확정되지 않는다.

---

## 2. 우선순위 개요와 단계별 완료 게이트

| 단계 | 목표(요구사항 §3) | 핵심 산출 | 완료 게이트(요구사항 §11 수용 기준 매핑) |
|------|------|----------|--------------------------------------|
| **P0** | 기본 기록 | 인증, 게시물 CRUD, 댓글, 태그, 페이징, 키워드 검색 | 가입·로그인 후 텍스트 게시물 작성 / 댓글·태그 추가·키워드 검색 / 목록·검색 페이지 반환 / 비인증·타인 데이터 차단 |
| **P1** | Memory 핵심 | memory chunk, embedding, pgvector Memory Search | 게시물 작성/수정 후 memory 상태 생성·갱신 / 자연어 Memory Search로 근거 chunk 조회 / embedding 실패가 CRUD 롤백 안 함 |
| **P2** | AI·친구 경험 | RAG AI 요약, Context Capsule, 친구 게시글·댓글·좋아요 | AI 요약이 근거 게시물 목록과 함께 반환 / Capsule 생성·조회 / 친구 승인 후 상호 조회·댓글·좋아요 / 비친구 차단 |
| **P3** | Agent·MCP·친구 AI | Agent Workflow, 친구 공유 기반 AI, MCP Server tool, Notion MCP Client | 친구 AI 동의+관계 충족 시 친구 근거 답변(출처 포함) / Agent 내부 tool 실행·이력 / 외부 쓰기 승인 후 실행 / MCP tool 호출 |
| **P4** | 마감 polish | 실행 이력 UI, 승인 UI, 품질 튜닝, 문서 동기화 | 승인 대기 처리·Agent 실행 이력 조회 / Track A·B smoke check / 롤백 / 문서 동기화 |

> **INFRA-0 (P0 선행 전제)**: P0 vertical slice가 동작하려면 로컬 Docker 실행 기반(PostgreSQL+pgvector, Spring Boot, FastAPI, React, health check)이 먼저 서야 한다. §3.0 참조.
> P4 화면(승인/이력)은 누락하지 않되 P0~P3 기능 동작 이후 polish 범위로 배치한다(프론트엔드 계약서 §2와 동일).

---

## 3.0 P0 선행 — 프로젝트 기반 (INFRA)

### Epic INFRA-0: 로컬 실행 기반 구성
> 참조: [로컬 Docker 실행 설계](DEPLOYMENT_LOCAL_DOCKER_MVP.md), 아키텍처 §9 · README §Quick Start

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P0-INFRA-1 | 리포 스캐폴딩: `backend/`, `frontend/`, `ai-server/`, `scripts/` 디렉터리와 빌드 골격 생성 | 각 서비스가 빈 상태로 빌드/기동 | — | README §Repository Structure |
| P0-INFRA-2 | `docker-compose.yml`로 PostgreSQL+pgvector 컨테이너 + extension 활성화 | `CREATE EXTENSION vector` 적용된 DB 기동 | P0-INFRA-1 | 아키텍처 §9, ERD pgvector |
| P0-INFRA-3 | Spring Boot `GET /api/health`, FastAPI `GET /health` health endpoint | 두 endpoint가 200 반환 | P0-INFRA-1 | 아키텍처 §9, 요구사항 §10 |
| P0-INFRA-4 | `.env.example` + 서비스별 환경 변수 로딩 (DB URL, JWT key, AI provider) | compose up으로 4개 서비스 동시 기동 | P0-INFRA-2,3 | 아키텍처 §9 |
| P0-INFRA-5 | DB 마이그레이션 도구 도입(Flyway/Liquibase 등)과 초기 스키마 베이스라인 | 마이그레이션으로 P0 테이블 생성 | P0-INFRA-2 | ERD ⚠️결정선행(인덱스 형식) |

**완료 게이트**: `docker compose up`으로 frontend/backend/ai-server/postgres가 함께 기동하고 health check가 통과한다(수용 기준 "Track A 로컬 Docker 환경에서 4개 서비스 함께 실행").

---

## 3.1 P0 — 기본 기록

### Epic P0-A: 인증/계정 (AUTH)
> 요구사항 §7.1 · API §9.1 · 화면 S-01/S-02/S-13

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P0-BE-1 | `users` 모델 + 회원가입: 이메일 unique, 비밀번호 해시 저장 | `POST /api/v1/auth/signup` 성공, 중복 이메일 거부, 평문 미저장 | P0-INFRA-5 | AUTH-001~003 |
| P0-BE-2 | 로그인 + 인증 수단 발급(JWT access + refresh rotation) ⚠️결정선행(JWT vs 세션) | `POST /api/v1/auth/login` 성공 시 토큰 발급 | P0-BE-1 | AUTH-004,005 / 요구사항 §13 |
| P0-BE-3 | 로그아웃 + 내 정보 조회 + 인증 필터(미인증 거부) | `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, 보호 API 401 | P0-BE-2 | AUTH-006,007,008 |
| P0-FE-1 | 인증 화면(로그인/회원가입)과 토큰 저장·401 refresh 흐름 | 가입·로그인 후 인증 라우트 진입 | P0-BE-1~3 | 프론트엔드 계약서 §3, S-01/S-02 |

### Epic P0-B: 게시물 CRUD (POST)
> 요구사항 §7.2 · API §9.2 · 화면 S-03~S-06

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P0-BE-4 | `posts` 모델 + 생성(제목·본문, 태그명 목록 포함) | `POST /api/v1/posts`로 제목·본문만으로 작성 | P0-BE-3 | POST-001,002,003 |
| P0-BE-5 | 본인 게시물 목록·상세 조회(소유권 검증) | `GET /api/v1/posts`, `GET /api/v1/posts/{postId}` | P0-BE-4 | POST-004 |
| P0-BE-6 | 게시물 수정(제목·본문·태그) / 삭제 + 연관 정리(댓글·태그연결) | `PUT`/`DELETE /api/v1/posts/{postId}`, 삭제 시 cascade | P0-BE-5 | POST-005,006,007 |
| P0-BE-7 | 타인 게시물 접근 차단(조회·검색·수정·삭제) | 비소유 게시물 요청 403/404 | P0-BE-5 | POST-010 |
| P0-FE-2 | 홈 피드 / 작성 / 상세 / 수정 화면 | 게시글 CRUD UI 동작 | P0-BE-4~7 | 프론트엔드 계약서, S-03~S-06 |

> 참고: POST-008/009(친구 게시물 조회)와 memory cascade(POST-007의 memory chunk·embedding 정리)는 각각 P2/P1에서 확장된다.

### Epic P0-C: 댓글 (COMMENT)
> 요구사항 §7.3 · API §9.2 · 화면 S-04

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P0-BE-8 | `comments` 모델 + 본인 게시물 댓글 작성 | `POST /api/v1/posts/{postId}/comments` | P0-BE-5 | COMMENT-001 |
| P0-BE-9 | 본인 댓글만 수정·삭제 / 비접근 게시물 댓글 차단 | `PUT`/`DELETE /api/v1/comments/{commentId}`, 권한 검증 | P0-BE-8 | COMMENT-002,006 |
| P0-FE-3 | 상세 화면 댓글 작성·수정·삭제 UI | 댓글 CRUD UI 동작 | P0-BE-8,9 | S-04 |

> COMMENT-003,004(검색·RAG 후보 포함)는 각각 P0 검색·P1 memory에서 충족된다. COMMENT-005(친구 게시물 댓글)는 P2.

### Epic P0-D: 태그 (TAG)
> 요구사항 §7.4 · API §9.2

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P0-BE-10 | `tags`/`post_tags` 모델 + 사용자별 태그 upsert(동일명 중복 방지) | 게시물 저장 시 태그명 저장, 사용자 내 중복 없음 | P0-BE-4 | TAG-001,002,003 |
| P0-BE-11 | 내 태그 목록 조회 | `GET /api/v1/tags` | P0-BE-10 | TAG-004 |
| P0-FE-4 | 작성/수정 화면 태그 입력 + 태그 목록 노출 | 태그 입력·조회 UI 동작 | P0-BE-10,11 | S-05 |

> TAG-005(검색·RAG 후보)는 P0 검색·P1 memory에서 충족.

### Epic P0-E: 페이징 + 키워드 검색 (SEARCH)
> 요구사항 §7.6 · API §9.2 · 화면 S-03/S-07

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P0-BE-12 | 최신순 페이징 응답(page,size,totalCount,totalPages) | 목록·검색이 페이지 메타 포함 반환 | P0-BE-5 | SEARCH-001,002,003 |
| P0-BE-13 | 키워드 검색(제목·본문·댓글·태그명), 기본 본인 범위 | `GET /api/v1/posts?q=...&scope=me` | P0-BE-12, P0-BE-8, P0-BE-10 | SEARCH-004,005, COMMENT-003, TAG-005 |
| P0-FE-5 | 키워드 검색 화면(페이지네이션 포함) | 검색·페이징 UI 동작 | P0-BE-13 | S-07 |

> SEARCH-006,007(친구 범위 검색·비친구 제외)는 친구 기능에 의존 → P2에서 확장(P2-BE-친구범위).

**P0 완료 게이트**: 가입·로그인 후 텍스트 게시물 작성, 댓글·태그 추가, 키워드 검색, 페이지 반환이 동작하고, 비인증·타인 데이터 접근이 차단된다(수용 기준 1~7행).

---

## 3.2 P1 — Memory 핵심

### Epic P1-A: Memory Chunk 파이프라인 (MEMORY)
> 요구사항 §7.7 · 아키텍처 §5.1 · API §9.3

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P1-BE-1 | `memory_chunks` 모델 + 게시물 제목·본문 chunk 생성(댓글·태그 context 포함) | 게시물 생성 시 chunk 생성, 소유권 경계 보존 | P0-BE-6 | MEMORY-001,002,005 |
| P1-BE-2 | 게시물 수정 시 chunk 갱신(기존 `stale` 처리), 삭제 시 검색 대상 제외 | 수정/삭제 후 active chunk가 최신 상태로 수렴 | P1-BE-1 | MEMORY-003,004, POST-007 / ⚠️결정선행(stale 보존 기간) |

### Epic P1-B: Embedding + pgvector (EMBED)
> 요구사항 §7.8 · 아키텍처 §4.3/§5.1 · API §9.3

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P1-BE-3 | `async_jobs` durable queue + worker(claim·timeout·retry) | pending job claim 후 상태 전이 | P0-INFRA-5 | 아키텍처 §4.3 |
| P1-BE-4 | embedding 생성 요청 흐름: Spring이 job·pending 생성 → FastAPI 위임 | `POST /api/v1/posts` 후 embedding pending 생성 | P1-BE-1, P1-BE-3, P1-AI-1 | EMBED-001, MEMORY-003 |
| P1-AI-1 | FastAPI embedding endpoint(mock/real provider 전환) ⚠️결정선행(provider·차원) | chunk 텍스트 → vector 반환 | P0-INFRA-3 | EMBED-001 / 요구사항 §13, 아키텍처 §11 |
| P1-BE-5 | `memory_embeddings` 저장 + 상태 관리(pending/running/succeeded/failed), 실패가 CRUD 롤백 안 함 | 게시물 유지, memoryStatus 전이 | P1-BE-4 | EMBED-002,003,004,005 |
| P1-BE-6 | 사용자별 격리 vector 검색 기반 + reindex 중복 방지 | scope=me vector 검색이 본인 데이터만 후보 | P1-BE-5 | EMBED-006, 아키텍처 §5.1 / ⚠️결정선행(index 형식) |
| P1-BE-7 | memory 상태/재색인 API | `GET /api/v1/posts/{postId}/memory-status`, `POST /api/v1/memories/reindex`, `GET /api/v1/jobs/{jobId}` | P1-BE-5 | EMBED-002,003, API §9.3 |

> EMBED-007(친구 vector 검색)은 친구 관계+AI 동의 의존 → P3.

### Epic P1-C: Memory Search (RAG 검색)
> 요구사항 §7.9(검색 부분) · 아키텍처 §5.2 · API §9.3

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P1-BE-8 | 자연어 Memory Search(scope=me): 접근 후보 제한 → pgvector similarity | `POST /api/v1/memory-search`가 게시물·근거 chunk 반환 | P1-BE-6 | RAG-001,002,003,004 |
| P1-BE-9 | 빈 결과 처리(빈 결과/답변 불가 메시지) | 결과 없음 시 빈 결과 반환 | P1-BE-8 | RAG-007 |
| P1-FE-1 | Memory Search 화면 + memory 상태 표시 + jobs polling | 작성 후 상태 표시·검색 결과 조회 | P1-BE-7,8 | 프론트엔드 계약서 §2(P1), S-05/S-08 |

**P1 완료 게이트**: 게시물 작성/수정 후 memory chunk·embedding 상태가 생성·갱신되고, 자연어 Memory Search로 관련 게시물·근거 chunk를 조회할 수 있으며, embedding 실패가 게시물 CRUD를 롤백하지 않는다(수용 기준 8~9행).

---

## 3.3 P2 — AI·친구 경험

### Epic P2-A: AI 요약 (RAG 요약)
> 요구사항 §7.9(요약 부분) · 아키텍처 §5.2/§7 · API §9.3

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P2-AI-1 | FastAPI 요약 생성(근거 chunk 기반, 근거 출처 포함) | sourcePostIds → answer + source summary | P1-AI-1 | RAG-005,006 |
| P2-BE-1 | 요약 API + sourcePostIds 재검증 + timeout 시 202/job 폴백 | `POST /api/v1/memory-search/summarize`, 요약 실패해도 검색 결과 유지 | P1-BE-8, P2-AI-1 | RAG-005,006,008, 아키텍처 §7 |
| P2-FE-1 | AI 요약 UI(근거 게시물 목록 표시, job 폴백) | 요약 답변+근거 노출 | P2-BE-1 | S-08 |

### Epic P2-B: 친구 관계·좋아요 (FRIEND)
> 요구사항 §7.5 · API §9.2 · 화면 S-09/S-10

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P2-BE-2 | `friendships` 모델 + 요청/승인/거절(pending·accepted·rejected, 양방향) | `POST /api/v1/friendships/requests`, accept/reject | P0-BE-3 | FRIEND-001,002,003,004 |
| P2-BE-3 | 친구 관계 해제 + 친구/요청 목록 조회 | `DELETE /api/v1/friendships/{id}`, `GET /api/v1/friendships` | P2-BE-2 | FRIEND-005 |
| P2-BE-4 | 친구 게시물 조회(목록·상세), 접근 범위 표시, 친구 댓글 | `GET /api/v1/posts?scope=friends`, 친구 게시물 댓글 작성 | P2-BE-2, P0-BE-5, P0-BE-8 | POST-008,009, COMMENT-005, FRIEND-006 |
| P2-BE-5 | `post_likes` 좋아요/취소(1회 제한, 비친구 차단), 목록·상세에 좋아요 수·여부 | `POST`/`DELETE /api/v1/posts/{postId}/likes` | P2-BE-4 | FRIEND-007,008,009,010 |
| P2-BE-6 | 친구 범위 키워드 검색 확장(비친구 항상 제외) | `scope=friends`/`all_accessible` 검색 | P0-BE-13, P2-BE-2 | SEARCH-006,007 |
| P2-BE-7 | `user_privacy_settings` 친구 AI 활용 전역 동의 toggle(기본 false) | `PUT /api/v1/privacy/ai-sharing` | P0-BE-3 | FRIEND-011,012, API §9.1 |
| P2-FE-2 | 친구 목록/요청, 친구 피드, 좋아요, 설정(동의 toggle) 화면 | 친구 흐름·좋아요·동의 UI 동작 | P2-BE-2~7 | 프론트엔드 계약서 §2(P2), S-09/S-10/S-13 |

> 동의 toggle(P2-BE-7)의 저장은 P2에서, 그 값에 따른 친구 AI 근거 사용 *집행*은 P3에서 검증한다.

### Epic P2-C: Context Capsule (CAPSULE, 본인 범위)
> 요구사항 §7.10 · 아키텍처 §5.3 · API §9.4 · 화면 S-11/S-12

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P2-BE-8 | `context_capsules`/`context_capsule_sources` 모델 + 생성(목적·요약·핵심사실·게시물·태그 구조화) | `POST /api/v1/context-capsules` | P1-BE-8, P2-AI-2 | CAPSULE-001,002,003 |
| P2-AI-2 | FastAPI Capsule 보조 생성(summary/keyFacts/tags) | 근거 chunk → summary/keyFacts/tags | P2-AI-1 | CAPSULE-002,003 |
| P2-BE-9 | Capsule compact context 형태 제공 ⚠️결정선행(JSON 구조) | 외부 LLM 전달용 compact context 반환 | P2-BE-8 | CAPSULE-004 / 요구사항 §13 |
| P2-BE-10 | Capsule 목록·상세·수정·삭제 + 타인 접근 차단 | `GET`/`PUT`/`DELETE /api/v1/context-capsules/{id}` | P2-BE-8 | CAPSULE-005,006,007,008 |
| P2-FE-3 | Capsule 목록·상세·수정·삭제 화면 | Capsule UI 동작 | P2-BE-8~10 | S-11/S-12 |

> CAPSULE-009,010(친구 데이터 포함 Capsule)은 친구 AI 근거 의존 → P3.

**P2 완료 게이트**: AI 요약이 근거 게시물 목록과 함께 반환되고, 본인 Capsule을 생성·조회할 수 있으며, 승인된 친구는 상호 게시글 조회·댓글·좋아요가 가능하고 비친구는 차단된다(수용 기준 5~6,13~14행).

---

## 3.4 P3 — Agent·MCP·친구 AI 활용

### Epic P3-A: 친구 공유 기반 AI 활용 (RAG 친구·EMBED 친구)
> 요구사항 §7.9(친구) · 아키텍처 §5.2 · API §9.3

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P3-BE-1 | 친구 vector 검색 권한 게이트(accepted + AI 동의 동시 검증) | 동의 꺼지면 친구 memory가 AI 근거에서 제외 | P1-BE-6, P2-BE-7 | EMBED-007, RAG-009 |
| P3-BE-2 | 친구 Memory Search + 출처 표시(범위: 제목·본문·태그·댓글) | `POST /api/v1/friends/{friendId}/memory-search`, 답변에 출처 사용자·게시글 | P3-BE-1 | RAG-010,011, MEMORY-006 |
| P3-BE-3 | 친구 기록 기반 생일선물 추천(공유 기록 근거만, 사적 추론 금지) | `POST /api/v1/friends/{friendId}/gift-recommendations`, 근거 포함 | P3-BE-2 | RAG-012 |
| P3-BE-4 | 친구 데이터 포함 Capsule(`contains_friend_context`, 출처 저장) | 친구 출처 Capsule 생성 시 출처·근거 저장 | P2-BE-8, P3-BE-1 | CAPSULE-009,010 / ⚠️결정선행(동의 철회 후 정책) |
| P3-FE-1 | 친구 Memory Search·선물 추천 화면(출처 표시) | 친구 AI UI 동작(job 폴백) | P3-BE-2,3 | 프론트엔드 계약서 §2(P3), S-14 |

### Epic P3-B: Agent Workflow (AGENT)
> 요구사항 §7.11 · 아키텍처 §5.4 · API §9.5 · 화면 S-15/S-16

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P3-AI-1 | FastAPI Agent graph(LangGraph) + 표준 tool 결과/실패 형식 ⚠️결정선행(step·시간·retry 한도) | tool 호출 결과·실패 표준 반환 | P2-AI-1 | AGENT-001,002 / 아키텍처 §11 |
| P3-BE-5 | 내부 tool 인터페이스(search_posts, search_memories, summarize, create_capsule, create_post_draft) | Agent가 권한 검증 거쳐 tool 결과 수신 | P1-BE-8, P2-BE-1, P2-BE-8 | AGENT-001, 아키텍처 §5.4 |
| P3-BE-6 | Agent 실행 시작·상태/결과·step 조회(`agent_runs`/`agent_steps`/`tool_call_logs`) | `POST /api/v1/agent-runs`, 상태 pending/running/succeeded/failed, step 입출력·실패 조회 | P3-AI-1, P3-BE-5 | AGENT-003,004,005,006,007 |
| P3-BE-7 | 쓰기성 작업 승인 게이트(`agent_approvals`): 승인 대기 정지·승인/거절 처리 | 게시물 생성·외부 export가 승인 전 미실행, 승인 시 실행·거절 시 취소 | P3-BE-6 | AGENT-008,009 |
| P3-BE-8 | Agent 친구 데이터 사용 시 관계·동의 검증, 선물 추천 use case 근거 포함 | 친구 근거 사용 전 검증, 결과에 근거 게시물 참조 | P3-BE-1, P3-BE-6 | AGENT-010,011 |
| P3-FE-2 | Agent 실행·승인 대기 화면 | Agent 실행·승인 UI 동작 | P3-BE-6,7 | S-15/S-16 |

### Epic P3-C: MCP Server / Client (MCP)
> 요구사항 §7.12 · 아키텍처 §5.5/§5.6 · API §9.6 · 화면 S-18

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P3-BE-9 | MCP Server tool: `search_memories`, `get_context_capsule`, `summarize_recent_posts`(구조화 응답) | 세 tool이 외부 LLM용 구조화 응답 반환 | P1-BE-8, P2-BE-1, P2-BE-10 | MCP-001,002,003,005 |
| P3-BE-10 | MCP scope·사용자 컨텍스트 검증 + credential 발급/폐기 ⚠️결정선행(인증·scope 모델) | tool 호출 시 scope·컨텍스트 식별·검증 | P3-BE-9 | MCP-004,006, 아키텍처 §5.5 / 요구사항 §13 |
| P3-BE-11 | `search_friend_memories` MCP tool(관계+동의+scope 검증, 출처 구조화) | 조건 충족 시에만 친구 데이터 반환, 출처 포함 | P3-BE-1, P3-BE-9 | MCP-012,013 |
| P3-BE-12 | MCP 호출 이력 저장(`mcp_connections`/`mcp_call_logs`, 마스킹) | 호출 이력 요약·마스킹 저장 | P3-BE-9 | MCP-007 |
| P3-AI-2 | Notion MCP Client tool(승인 후 export, idempotency) | 승인 완료 이벤트 후 Notion 저장 실행 | P3-BE-7, P3-AI-1 | MCP-008,009,010 |
| P3-BE-13 | 외부 호출 실패를 Agent 결과·호출 이력에 반영 | export 실패가 run 결과·log에 기록 | P3-AI-2, P3-BE-12 | MCP-011 |
| P3-FE-3 | MCP 연결 관리 화면 | MCP tool/connection 상태 UI 동작 | P3-BE-9~12 | S-18 |

**P3 완료 게이트**: 친구 관계+AI 동의 충족 시 친구 근거 답변(출처 포함)이 가능하고, Agent가 내부 tool을 실행·이력을 남기며, 외부 쓰기는 승인 후에만 실행되고, MCP Server tool로 memory 검색·Capsule 조회·최근 요약을 호출할 수 있다(수용 기준 11~12,15~18행).

---

## 3.5 P4 — 마감 polish

### Epic P4-A: 실행 이력·승인 UI polish (AGENT 이력)
> 요구사항 §3(P4) · 프론트엔드 계약서 §2(P4) · 화면 S-16/S-17

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P4-BE-1 | Agent 실행 이력 목록·상세 API(페이징) | `GET /api/v1/agent-runs?page&size`, step 상세 | P3-BE-6 | AGENT-006,007 |
| P4-FE-1 | 승인 대기·Agent 실행 이력 화면 polish | 승인 처리·이력 목록·상세 UI 동작 | P4-BE-1, P3-BE-7 | S-16/S-17 |

### Epic P4-B: 품질 튜닝
| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P4-X-1 | 검색 성능 튜닝(owner 필터·기간 제한·top-k, index 재검토) | 친구 후보 증가 시에도 검색 응답 유지 | P1-BE-6, P3-BE-2 | 아키텍처 §5.2 |
| P4-X-2 | mock→real AI provider 전환·관측성(로그 마스킹 점검) | provider 전환 동작, 민감정보 미저장 | P1-AI-1 | 아키텍처 §6.4/§8 / ⚠️결정선행(provider) |

### Epic P4-C: 배포·문서 동기화
> 참조: [로컬 Docker 설계](DEPLOYMENT_LOCAL_DOCKER_MVP.md), [AWS 배포 설계](DEPLOYMENT_AWS_MVP.md)

| Task ID | Story / Task | DoD | 의존성 | 추적 |
|---------|--------------|-----|--------|------|
| P4-INFRA-1 | Track A smoke check 스크립트(가입~AI 요약 시나리오) | 로컬 smoke 시나리오 통과 | P3 전체 | 수용 기준(Track A), 로컬 Docker 설계 |
| P4-INFRA-2 | Track B AWS 배포(ECS/RDS/S3/CloudFront, Secrets Manager) ⚠️결정선행(도메인·NAT) | HTTPS 접속·health·smoke·재배포 후 데이터 유지·수동 롤백 | P4-INFRA-1 | 수용 기준(Track B), AWS 배포 설계 / 요구사항 §13 |
| P4-DOC-1 | README·문서 최종 동기화 | 구현 범위 반영된 README | P4-INFRA-2 | 요구사항 §13 |

**P4 완료 게이트**: 승인 대기 처리·Agent 실행 이력 조회가 동작하고, Track A·B smoke check가 통과하며, 수동 롤백과 문서 동기화가 가능하다(수용 기준 19~26행).

---

## 4. 레이어 간 통합/의존성

아키텍처 §5의 핵심 흐름을 Task 의존성으로 요약한다(왼쪽이 트리거, 오른쪽이 후속 처리).

| 통합 지점 | 흐름 | 관련 Task |
|-----------|------|----------|
| 게시물 → memory indexing | 게시물 작성/수정(BE) → async_jobs·chunk·embedding pending(BE) → embedding 계산(AI) → embedding 저장(BE) | P0-BE-4/6 → P1-BE-1/3/4 → P1-AI-1 → P1-BE-5 |
| Memory Search → 요약 | scope·권한 검증(BE) → pgvector 검색(BE) → 요약 생성(AI) | P1-BE-8 → P2-AI-1/P2-BE-1 |
| 친구 AI 게이트 | 관계+동의 검증(BE) → 친구 vector 검색/요약(BE+AI) → 출처 표시 | P2-BE-2/7 → P3-BE-1 → P3-BE-2 |
| Capsule 생성 | 권한·근거 선택(BE) → summary/keyFacts(AI) → 저장(BE) | P1-BE-8 → P2-AI-2 → P2-BE-8 |
| Agent 실행 | run 생성(BE) → graph 실행(AI) → tool 권한 검증·결과(BE) → 승인 게이트(BE) → 재개 | P3-BE-6 → P3-AI-1 → P3-BE-5/7 |
| MCP Server | 외부 client → Spring scope 경계(BE) → tool 실행 | P3-BE-10 → P3-BE-9/11 |
| MCP Client(Notion) | 승인(BE) → export 실행(AI) → 결과·이력 저장(BE) | P3-BE-7 → P3-AI-2 → P3-BE-12/13 |

**불변 원칙**: 모든 친구/MCP/AI 근거 사용은 Spring Boot(BE) 권한 게이트를 먼저 통과해야 하며, FastAPI(AI)는 권한을 재판단하지 않고 전달된 scope 내에서만 계산한다(아키텍처 §2.1).

---

## 5. 권장 구현 경로 (요약)

1. **기반 먼저**: `INFRA-0`(P0-INFRA-1~5) — Docker Compose·DB·pgvector·health·마이그레이션.
2. **P0 vertical slice**: 인증 → 게시물 CRUD → 댓글·태그 → 페이징·키워드 검색. (BE 선행, FE 뒤따름)
3. **P1**: memory chunk → async_jobs/worker → embedding(AI) → memory_embeddings → Memory Search(scope=me).
4. **P2**: AI 요약 → 친구 관계·좋아요·친구 게시물·친구 범위 검색 → 동의 toggle → 본인 Capsule.
5. **P3**: 친구 AI 게이트 → 친구 Search·선물 추천·친구 Capsule → Agent(tool·승인) → MCP Server·Notion Client.
6. **P4**: 이력·승인 UI polish → 검색·provider 튜닝 → Track A smoke → Track B AWS 배포 → 문서 동기화.

각 단계는 위 "완료 게이트"를 통과한 뒤 다음 단계로 넘어가며, 게이트는 요구사항 §11 수용 기준 및 Track A/B smoke check와 연결된다.

---

## 부록 A. 기능 요구사항 커버리지 매핑

| 요구사항 그룹 | ID 범위 | 커버 Task |
|---------------|---------|-----------|
| 인증 | AUTH-001~008 | P0-BE-1,2,3 / P0-FE-1 |
| 게시물 | POST-001~010 | P0-BE-4~7 / (008,009→P2-BE-4) / (007 memory→P1-BE-2) |
| 댓글 | COMMENT-001~006 | P0-BE-8,9 / (003→P0-BE-13) / (004→P1-BE-1) / (005→P2-BE-4) |
| 태그 | TAG-001~005 | P0-BE-10,11 / (005→P0-BE-13, P1-BE-1) |
| 친구·좋아요 | FRIEND-001~012 | P2-BE-2~5,7 |
| 페이징·검색 | SEARCH-001~007 | P0-BE-12,13 / (006,007→P2-BE-6) |
| Memory Chunk | MEMORY-001~006 | P1-BE-1,2 / (006→P3-BE-2) |
| Embedding | EMBED-001~007 | P1-BE-3~7, P1-AI-1 / (007→P3-BE-1) |
| Memory Search·요약 | RAG-001~012 | P1-BE-8,9 / 요약 P2-AI-1,P2-BE-1 / 친구 P3-BE-1,2,3 |
| Capsule | CAPSULE-001~010 | P2-BE-8~10, P2-AI-2 / 친구 P3-BE-4 |
| Agent | AGENT-001~011 | P3-AI-1, P3-BE-5~8 / 이력 P4-BE-1 |
| MCP | MCP-001~013 | P3-BE-9~13, P3-AI-2 |

> 점검: 요구사항 §7의 전체 기능 ID가 최소 하나의 Task로 매핑된다(누락 0).

## 부록 B. 결정 선행(⚠️) 항목

구현 전 확정이 필요한 항목과 영향 Task. 출처: 요구사항 §13, 아키텍처 §11.

| 미결정 항목 | 영향 Task |
|-------------|----------|
| 인증 방식(JWT stateless vs 세션 쿠키) | P0-BE-2 |
| embedding provider/model·차원, mock↔real 전환 | P1-AI-1, P4-X-2 |
| pgvector index(hnsw vs ivfflat), stale 보존 기간 | P0-INFRA-5, P1-BE-2, P1-BE-6 |
| Capsule compact context JSON 구조 | P2-BE-9 |
| 친구 AI 동의 철회 후 기존 Capsule/Agent 결과 정책 | P3-BE-4 |
| Agent 최대 step·시간·retry 한도 | P3-AI-1 |
| MCP 인증·scope 모델, credential 형식 | P3-BE-10 |
| AWS 도메인·Route 53·NAT 비용 범위 | P4-INFRA-2 |

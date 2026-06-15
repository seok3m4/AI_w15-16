# 요구사항 정의서 — 텍스트 기반 Memory MVP

## 1. 문서 목적

이 문서는 Memento MVP의 요구사항을 텍스트 기반 개인 기록 흐름으로 재정의한다.

이번 MVP는 이미지 기능을 제외하고, 텍스트 게시물에서 출발해 RAG 검색, AI 요약, Context Capsule, Agent Workflow, MCP 연동까지 닿는 제품 가치를 우선 검증한다.

## 2. MVP 방향

Memento는 사용자가 남긴 개인 기록을 AI가 검색, 요약, 재사용할 수 있는 개인 메모리 컨텍스트로 바꾸는 서비스다. 첫 구현에서는 사진이나 OCR 없이도 이 가치를 검증할 수 있도록 게시글 제목, 본문, 댓글, 태그를 memory source로 사용한다.

사용자는 게시물을 작성한다고 느끼지만, 시스템은 내부적으로 이를 `MemoryChunk`와 `MemoryEmbedding`으로 변환해 자연어 검색과 후속 Agent/MCP 흐름의 근거로 사용한다.

## 3. 우선순위

| Priority | 목표 | 포함 범위 |
|----------|------|-----------|
| P0 | 기본 기록 | 인증, 게시물 CRUD, 댓글, 태그, 페이징, 키워드 검색 |
| P1 | Memory 핵심 | 텍스트 memory chunk, embedding 저장, pgvector Memory Search |
| P2 | AI 경험/친구 상호작용 | RAG 기반 AI 요약, 근거 게시물 표시, Context Capsule, 친구 게시글 조회/댓글/좋아요 |
| P3 | Agent/MCP/친구 AI 활용 | Agent Workflow, 친구 공유 데이터 기반 AI 활용, MCP Server tool, Notion 우선 MCP Client |
| P4 | 마감 polish | 실행 이력, 승인 UI, 품질 튜닝, 문서 동기화 |

## 4. 포함 범위

- 회원가입, 로그인, 로그아웃, 내 정보 조회
- 텍스트 기반 Memory Post CRUD
- 댓글 작성, 수정, 삭제
- 태그 연결 및 태그 목록 조회
- 친구 요청, 승인, 거절, 친구 관계 해제
- 승인된 친구 간 게시글 조회, 댓글, 좋아요
- 친구 AI 활용 전역 동의 설정
- 게시물 목록 페이징
- 제목, 본문, 댓글, 태그 기반 키워드 검색
- 게시물/댓글/태그 기반 memory chunk 생성
- embedding 생성 요청, 상태 관리, pgvector 저장
- 자연어 query 기반 Memory Search
- Memory Search 결과 기반 AI 요약
- Context Capsule 생성, 조회, 수정, 삭제
- Agent 내부 tool 인터페이스와 Agent 실행 흐름
- 사용자 승인 기반 외부 쓰기 작업 처리
- MCP Server tool 제공
- Notion export를 1차 대상으로 하는 MCP Client 연동
- 사용자별 데이터 접근 제어와 scope 검증

## 5. 제외 범위

- 이미지 첨부
- 이미지 캡션, OCR, 이미지 메타데이터 분석
- 이미지 기반 자동 태그 후보
- 멀티모달 검색
- 공개 피드, 팔로우, 친구 추천, DM, 알림, 차단 기능
- 게시글별 공개 범위 설정
- 친구별 AI 공유 동의 설정
- 좋아요 패턴 기반 AI 추천
- 모바일 앱
- 대규모 OpenSearch 운영
- 관리자 기능
- 비밀번호 재설정, 이메일 인증, 소셜 로그인

## 6. 사용자와 권한

### 6.1 대상 사용자

대상 사용자는 개인 기록을 텍스트로 남기고, 나중에 자연어 검색과 외부 LLM/Notion 연동을 통해 재사용하려는 로그인 사용자다.

### 6.2 권한 원칙

- 비로그인 사용자는 회원가입과 로그인만 할 수 있다.
- 로그인 사용자는 본인 게시물, 댓글, 태그, memory, capsule, agent run을 조회할 수 있다.
- 서로 승인된 친구는 상대방 게시물을 조회하고, 댓글과 좋아요를 남길 수 있다.
- 친구가 아닌 사용자의 데이터는 목록, 검색 결과, 상세 조회, AI 요약 근거, MCP tool 응답에 포함되지 않는다.
- AI 기능은 기본적으로 본인 memory만 사용한다.
- 사용자가 특정 친구 맥락을 명시적으로 요청하고, 해당 친구가 친구 AI 활용 전역 동의를 켠 경우에만 친구 게시글과 댓글을 AI 근거로 사용할 수 있다.
- 친구의 좋아요 패턴은 MVP AI 근거로 사용하지 않는다.
- Agent 또는 MCP Client가 외부 서비스에 쓰기 작업을 수행하기 전에는 사용자 승인을 요구한다.
- MCP Server tool 호출은 사용자 컨텍스트와 허용 scope를 기준으로 실행한다.

## 7. 기능 요구사항

### 7.1 인증

| ID | 요구사항 |
|----|----------|
| AUTH-001 | 사용자는 이메일, 비밀번호, 닉네임으로 회원가입할 수 있다. |
| AUTH-002 | 이메일은 서비스 안에서 고유해야 한다. |
| AUTH-003 | 비밀번호는 평문으로 저장하지 않는다. |
| AUTH-004 | 사용자는 이메일과 비밀번호로 로그인할 수 있다. |
| AUTH-005 | 로그인 성공 시 이후 API 호출에 사용할 인증 수단을 발급한다. |
| AUTH-006 | 로그인 사용자는 로그아웃할 수 있다. |
| AUTH-007 | 로그인 사용자는 현재 로그인된 본인 정보를 조회할 수 있다. |
| AUTH-008 | 인증이 필요한 API는 미인증 요청을 거부한다. |

### 7.2 Memory Post

| ID | 요구사항 |
|----|----------|
| POST-001 | 로그인 사용자는 제목과 본문만으로 게시물을 작성할 수 있다. |
| POST-002 | 게시물은 텍스트 기반 개인 기록 단위로 정의한다. |
| POST-003 | 게시물 생성/수정 요청에는 태그명 목록을 포함할 수 있다. |
| POST-004 | 로그인 사용자는 본인 게시물 목록과 상세를 조회할 수 있다. |
| POST-005 | 로그인 사용자는 본인 게시물의 제목, 본문, 태그 목록을 수정할 수 있다. |
| POST-006 | 로그인 사용자는 본인 게시물을 삭제할 수 있다. |
| POST-007 | 게시물 삭제 시 댓글, 태그 연결, memory chunk, embedding 검색 대상이 함께 정리된다. |
| POST-008 | 승인된 친구는 친구 게시물 목록과 상세를 조회할 수 있다. |
| POST-009 | 친구 게시물 조회 결과에는 작성자와 친구 관계에 따른 접근 가능 범위가 표시된다. |
| POST-010 | 친구가 아닌 다른 사용자의 게시물은 조회, 검색, 수정, 삭제할 수 없다. |

### 7.3 댓글

| ID | 요구사항 |
|----|----------|
| COMMENT-001 | 로그인 사용자는 본인 게시물에 댓글을 작성할 수 있다. |
| COMMENT-002 | 로그인 사용자는 본인이 작성한 댓글만 수정, 삭제할 수 있다. |
| COMMENT-003 | 댓글은 키워드 검색 대상에 포함된다. |
| COMMENT-004 | 댓글은 텍스트 RAG context 후보에 포함될 수 있다. |
| COMMENT-005 | 승인된 친구는 친구 게시물에 댓글을 작성할 수 있다. |
| COMMENT-006 | 친구가 아닌 다른 사용자의 게시물에 속한 댓글은 조회, 작성, 수정, 삭제할 수 없다. |

### 7.4 태그

| ID | 요구사항 |
|----|----------|
| TAG-001 | 사용자는 게시물 생성/수정 시 태그명을 함께 저장할 수 있다. |
| TAG-002 | 태그는 사용자별로 관리된다. |
| TAG-003 | 같은 사용자 안에서 같은 태그명은 중복 생성하지 않는다. |
| TAG-004 | 로그인 사용자는 본인이 사용한 태그 목록을 조회할 수 있다. |
| TAG-005 | 태그는 키워드 검색과 RAG context 후보에 포함될 수 있다. |

### 7.5 친구와 좋아요

| ID | 요구사항 |
|----|----------|
| FRIEND-001 | 로그인 사용자는 다른 사용자에게 친구 요청을 보낼 수 있다. |
| FRIEND-002 | 친구 요청을 받은 사용자는 요청을 승인하거나 거절할 수 있다. |
| FRIEND-003 | 친구 관계는 pending, accepted, rejected 상태를 가진다. |
| FRIEND-004 | 서로 승인된 친구 관계가 성립되면 양방향 친구로 간주한다. |
| FRIEND-005 | 사용자는 성립된 친구 관계를 해제할 수 있다. |
| FRIEND-006 | 승인된 친구는 서로의 게시글을 조회할 수 있다. |
| FRIEND-007 | 승인된 친구는 서로의 게시글에 좋아요를 남기거나 취소할 수 있다. |
| FRIEND-008 | 같은 사용자는 같은 게시글에 좋아요를 한 번만 남길 수 있다. |
| FRIEND-009 | 친구가 아닌 사용자는 게시글 좋아요를 남길 수 없다. |
| FRIEND-010 | 게시물 목록과 상세에는 좋아요 수와 현재 사용자의 좋아요 여부가 포함된다. |
| FRIEND-011 | 사용자는 친구 AI 활용 전역 동의를 켜거나 끌 수 있다. |
| FRIEND-012 | 친구 AI 활용 전역 동의의 기본값은 false다. |

### 7.6 페이징과 키워드 검색

| ID | 요구사항 |
|----|----------|
| SEARCH-001 | 게시물 목록은 최신순으로 페이지 조회된다. |
| SEARCH-002 | 키워드 검색 결과는 최신순으로 페이지 조회된다. |
| SEARCH-003 | 페이지 응답에는 page, size, totalCount, totalPages가 포함된다. |
| SEARCH-004 | 키워드 검색 대상은 게시물 제목, 본문, 댓글 본문, 태그명이다. |
| SEARCH-005 | 기본 키워드 검색 결과에는 본인 게시물만 포함된다. |
| SEARCH-006 | 친구 범위 검색을 명시하면 승인된 친구 게시물을 검색 결과에 포함할 수 있다. |
| SEARCH-007 | 친구가 아닌 사용자의 게시물은 어떤 검색 범위에서도 포함되지 않는다. |

### 7.7 Memory Chunk

| ID | 요구사항 |
|----|----------|
| MEMORY-001 | 게시물 제목과 본문을 memory chunk로 생성한다. |
| MEMORY-002 | 댓글과 태그는 memory context에 포함할 수 있다. |
| MEMORY-003 | 게시물 생성/수정 시 관련 memory chunk를 생성 또는 갱신한다. |
| MEMORY-004 | 게시물 삭제 시 관련 memory chunk를 검색 대상에서 제거한다. |
| MEMORY-005 | memory chunk는 사용자와 원본 게시물 소유권 경계를 보존해야 한다. |
| MEMORY-006 | 친구 게시물의 memory chunk가 AI 근거로 쓰일 때는 원본 소유자와 요청자를 구분할 수 있어야 한다. |

### 7.8 Embedding과 pgvector 저장

| ID | 요구사항 |
|----|----------|
| EMBED-001 | Spring Boot 또는 FastAPI는 memory chunk embedding 생성을 요청할 수 있다. |
| EMBED-002 | embedding 처리 상태는 pending, running, succeeded, failed 중 하나로 관리한다. |
| EMBED-003 | embedding 실패 시 게시물 CRUD 자체는 유지된다. |
| EMBED-004 | memory chunk와 embedding vector는 연결되어 저장된다. |
| EMBED-005 | 게시물 수정 시 이전 embedding은 갱신되거나 비활성화된다. |
| EMBED-006 | 기본 vector 검색은 사용자별 격리가 보장되어야 한다. |
| EMBED-007 | 친구 vector 검색은 친구 관계와 AI 공유 동의가 모두 확인된 경우에만 허용된다. |

### 7.9 Memory Search와 AI 요약

| ID | 요구사항 |
|----|----------|
| RAG-001 | 사용자는 자연어 query로 본인 memory를 검색할 수 있다. |
| RAG-002 | 검색 대상은 최소 게시물 제목과 본문 embedding을 포함한다. |
| RAG-003 | 가능하면 댓글과 태그 context도 검색 근거에 포함한다. |
| RAG-004 | 검색 결과는 관련 게시물과 근거 chunk를 포함한다. |
| RAG-005 | AI 요약은 검색된 memory chunk와 게시물을 근거로 생성한다. |
| RAG-006 | AI 요약 답변에는 근거 게시물 목록이 포함된다. |
| RAG-007 | 검색 결과가 없으면 빈 결과 또는 답변 불가 메시지를 반환한다. |
| RAG-008 | 요약 실패 시 검색 결과 목록은 정상 반환된다. |
| RAG-009 | 사용자가 특정 친구 맥락을 요청하면 친구 관계와 친구의 AI 공유 동의를 검증한다. |
| RAG-010 | 친구 AI 활용 범위는 친구 게시글 제목, 본문, 태그, 댓글로 제한한다. |
| RAG-011 | 친구 데이터가 AI 근거로 사용되면 답변에 출처 사용자와 게시글 참조를 표시한다. |
| RAG-012 | 생일선물 추천처럼 친구 맥락을 사용하는 기능은 근거 없는 사적 추론을 하지 않고 공유된 기록 기반으로만 답변하는 것을 원칙으로 한다. |

### 7.10 Context Capsule

| ID | 요구사항 |
|----|----------|
| CAPSULE-001 | 사용자는 목적 또는 주제를 입력해 Context Capsule을 생성할 수 있다. |
| CAPSULE-002 | Capsule은 관련 memory chunk, 요약, 근거 게시물 목록을 포함한다. |
| CAPSULE-003 | Capsule은 목적, 요약, 핵심 사실, 관련 게시물, 태그를 구조화해 저장한다. |
| CAPSULE-004 | Capsule은 외부 LLM에 전달 가능한 compact context 형태를 제공한다. |
| CAPSULE-005 | 사용자는 본인 Capsule 목록과 상세를 조회할 수 있다. |
| CAPSULE-006 | 사용자는 Capsule 제목 또는 설명을 수정할 수 있다. |
| CAPSULE-007 | 사용자는 Capsule을 삭제할 수 있다. |
| CAPSULE-008 | 다른 사용자의 Capsule에는 접근할 수 없다. |
| CAPSULE-009 | 친구 데이터가 포함된 Capsule은 친구 관계와 AI 공유 동의가 유지되는 경우에만 생성할 수 있다. |
| CAPSULE-010 | 친구 데이터가 포함된 Capsule에는 출처 사용자와 근거 게시물 목록을 저장한다. |

### 7.11 Agent Workflow

| ID | 요구사항 |
|----|----------|
| AGENT-001 | Agent는 게시물 검색, Memory Search, Capsule 생성, 게시물 초안 생성 tool을 사용할 수 있다. |
| AGENT-002 | tool 호출 결과와 실패는 표준 형식으로 반환된다. |
| AGENT-003 | 사용자는 목표를 입력해 Agent 실행을 시작할 수 있다. |
| AGENT-004 | Agent 실행 상태는 pending, running, succeeded, failed로 관리된다. |
| AGENT-005 | Agent 실행 결과는 사용자에게 반환된다. |
| AGENT-006 | AgentRun, AgentStep, ToolCallLog를 저장한다. |
| AGENT-007 | 각 step의 입력, 출력, 상태와 실패 원인을 확인할 수 있다. |
| AGENT-008 | 게시물 생성, 외부 export 등 쓰기성 작업은 승인 대기 상태로 멈춘다. |
| AGENT-009 | 사용자가 승인하면 작업을 실행하고, 거절하면 취소한다. |
| AGENT-010 | Agent가 친구 데이터를 사용하려면 친구 관계와 AI 공유 동의를 먼저 검증한다. |
| AGENT-011 | 친구 선물 추천 use case는 친구 게시글/댓글 근거를 사용하며, 근거 게시물 참조를 결과에 포함한다. |

### 7.12 MCP Server/Client

| ID | 요구사항 |
|----|----------|
| MCP-001 | MCP Server는 `search_memories` tool을 제공한다. |
| MCP-002 | MCP Server는 `get_context_capsule` tool을 제공한다. |
| MCP-003 | MCP Server는 `summarize_recent_posts` tool을 제공한다. |
| MCP-004 | MCP tool 호출 시 사용자 scope와 권한을 검증한다. |
| MCP-005 | MCP tool 응답은 외부 LLM이 사용할 수 있는 구조화된 형태여야 한다. |
| MCP-006 | MCP 요청이 어떤 사용자 컨텍스트로 실행되는지 식별한다. |
| MCP-007 | MCP 호출 이력을 저장한다. |
| MCP-008 | MVP MCP Client는 Notion export/저장 흐름을 1차 대상으로 한다. |
| MCP-009 | Agent Workflow에서 Notion MCP Client tool을 호출할 수 있다. |
| MCP-010 | Notion 등 외부 쓰기 작업은 사용자 승인 이후에만 실행된다. |
| MCP-011 | 외부 호출 실패는 Agent 실행 결과와 호출 이력에 반영된다. |
| MCP-012 | MCP Server tool이 친구 데이터를 반환하려면 친구 관계, 친구 AI 공유 동의, 요청 scope를 모두 검증한다. |
| MCP-013 | MCP 응답에 친구 데이터가 포함되면 출처 사용자와 게시글 참조를 구조화해 포함한다. |

## 8. 데이터 요구사항

| 모델 | 핵심 역할 |
|------|-----------|
| User | 인증 사용자와 소유권 경계 |
| Post | 텍스트 기반 Memory Post |
| Comment | 게시물 보조 맥락과 검색/RAG 후보 |
| Tag | 사용자별 기록 분류와 검색/RAG 후보 |
| PostTag | 게시물과 태그의 다대다 연결 |
| Friendship | 친구 요청, 승인, 거절, 해제 상태 |
| PostLike | 승인된 친구 또는 작성자의 게시글 좋아요 |
| UserPrivacySetting | 친구 AI 활용 전역 동의 설정 |
| MemoryChunk | 게시물/댓글/태그에서 파생된 RAG 단위 텍스트 |
| MemoryEmbedding | MemoryChunk의 embedding vector와 처리 상태 |
| ContextCapsule | 목적별 compact context와 근거 게시물 묶음 |
| AgentRun | 사용자 목표 기반 Agent 실행 단위 |
| AgentStep | Agent 실행의 단계별 입력, 출력, 상태 |
| ToolCallLog | 내부 tool, MCP tool 호출 이력 |
| McpConnection | 외부 MCP Server 연결 설정 |
| McpCallLog | MCP Server/Client 호출 이력과 결과 |

## 9. API 요구사항 초안

상세 요청/응답 JSON, 상태 코드, 에러 포맷은 후속 API 명세서에서 확정한다.

### 9.1 인증 API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 내 정보 조회 |
| PUT | `/api/privacy/ai-sharing` | 친구 AI 활용 전역 동의 설정 |

### 9.2 게시판 API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/posts` | 게시물 생성 |
| GET | `/api/posts` | 게시물 목록 및 키워드 검색 |
| GET | `/api/posts/{postId}` | 게시물 상세 조회 |
| PUT | `/api/posts/{postId}` | 게시물 수정 |
| DELETE | `/api/posts/{postId}` | 게시물 삭제 |
| POST | `/api/posts/{postId}/comments` | 댓글 생성 |
| PUT | `/api/comments/{commentId}` | 댓글 수정 |
| DELETE | `/api/comments/{commentId}` | 댓글 삭제 |
| GET | `/api/tags` | 내 태그 목록 조회 |
| POST | `/api/friendships/requests` | 친구 요청 |
| GET | `/api/friendships` | 친구/요청 목록 조회 |
| POST | `/api/friendships/{friendshipId}/accept` | 친구 요청 승인 |
| POST | `/api/friendships/{friendshipId}/reject` | 친구 요청 거절 |
| DELETE | `/api/friendships/{friendshipId}` | 친구 관계 해제 |
| POST | `/api/posts/{postId}/likes` | 게시글 좋아요 |
| DELETE | `/api/posts/{postId}/likes` | 게시글 좋아요 취소 |

### 9.3 Memory/RAG API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/memories/reindex` | 내 memory chunk/embedding 재생성 요청 |
| GET | `/api/posts/{postId}/memory-status` | 게시물 memory 처리 상태 조회 |
| POST | `/api/memory-search` | 자연어 Memory Search |
| POST | `/api/memory-search/summarize` | 검색 결과 기반 AI 요약 |
| POST | `/api/friends/{friendId}/memory-search` | 친구 공유 동의 기반 친구 Memory Search |
| POST | `/api/friends/{friendId}/gift-recommendations` | 친구 기록 기반 생일선물 추천 |

### 9.4 Context Capsule API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/context-capsules` | Capsule 생성 |
| GET | `/api/context-capsules` | Capsule 목록 조회 |
| GET | `/api/context-capsules/{capsuleId}` | Capsule 상세 조회 |
| PUT | `/api/context-capsules/{capsuleId}` | Capsule 제목/설명 수정 |
| DELETE | `/api/context-capsules/{capsuleId}` | Capsule 삭제 |

### 9.5 Agent API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/agent-runs` | Agent 실행 시작 |
| GET | `/api/agent-runs/{runId}` | Agent 실행 상태/결과 조회 |
| GET | `/api/agent-runs/{runId}/steps` | Agent step 목록 조회 |
| POST | `/api/agent-runs/{runId}/approvals/{approvalId}/approve` | 승인 대기 작업 승인 |
| POST | `/api/agent-runs/{runId}/approvals/{approvalId}/reject` | 승인 대기 작업 거절 |

### 9.6 MCP 인터페이스

| 구분 | 인터페이스 | 설명 |
|------|------------|------|
| MCP Server tool | `search_memories` | 자연어 query로 사용자 memory 검색 |
| MCP Server tool | `get_context_capsule` | Context Capsule 조회 |
| MCP Server tool | `summarize_recent_posts` | 최근 게시물 요약 |
| MCP Server tool | `search_friend_memories` | 친구 관계와 공유 동의 기반 친구 memory 검색 |
| MCP Client | Notion export tool | 승인된 Capsule 또는 회고 결과를 Notion에 저장 |

## 10. 아키텍처 요구사항

- React는 인증, 게시물, 검색, Capsule, Agent 실행, 승인 대기, MCP 상태 확인 화면을 담당한다.
- Spring Boot는 인증, 권한, 게시판 CRUD, 데이터 소유권 검증, API orchestration을 담당한다.
- FastAPI는 embedding 생성, AI 요약, Agent 실행, LLM/tool orchestration을 담당한다.
- PostgreSQL은 사용자, 게시물, 댓글, 태그, 친구 관계, 좋아요, 공유 동의, Capsule, Agent/MCP 이력을 저장한다.
- pgvector는 MemoryEmbedding의 vector 검색을 담당한다.
- 게시물 작성/수정 후 memory chunk와 embedding 생성 흐름이 실행된다.
- embedding 실패는 게시물 CRUD 성공을 롤백하지 않고 상태로 노출한다.
- 친구 데이터 조회와 AI 활용은 Spring Boot에서 친구 관계와 공유 동의를 검증한 뒤 FastAPI에 전달한다.
- 외부 쓰기 작업은 승인 대기 상태를 거쳐 실행한다.

## 11. 수용 기준

- 사용자가 가입, 로그인한 뒤 텍스트 게시물을 작성할 수 있다.
- 게시물은 이미지 없이 제목과 본문만으로 생성된다.
- 사용자가 댓글과 태그를 추가하고 키워드로 검색할 수 있다.
- 사용자가 친구 요청을 보내고 상대가 승인하면 친구 관계가 성립된다.
- 승인된 친구는 서로의 게시글을 조회하고 댓글과 좋아요를 남길 수 있다.
- 친구가 아닌 사용자는 게시글 조회, 댓글, 좋아요, 검색, AI 활용이 차단된다.
- 목록과 키워드 검색 결과가 페이지 단위로 반환된다.
- 게시물 작성/수정 후 memory chunk와 embedding 상태가 생성 또는 갱신된다.
- 자연어 Memory Search로 관련 게시물과 근거 chunk를 조회할 수 있다.
- AI 요약 답변은 검색 근거 게시물 목록과 함께 반환된다.
- 사용자가 AI 공유 동의를 끄면 친구가 게시글을 볼 수 있어도 AI 검색/요약/Capsule/Agent 근거로는 사용할 수 없다.
- 사용자가 AI 공유 동의를 켜고 친구 관계가 승인되어 있으면, 친구는 명시적으로 친구 맥락을 요청해 게시글/댓글 기반 AI 기능을 사용할 수 있다.
- "친구에게 생일선물 추천해줘" 요청은 친구 관계와 공유 동의가 모두 충족될 때만 친구 게시글/댓글 근거로 답변한다.
- 사용자가 목적 또는 주제로 Context Capsule을 생성하고 조회할 수 있다.
- Agent가 내부 tool을 호출해 작업을 실행하고 실행 이력을 남긴다.
- 외부 쓰기 작업은 승인 전 실행되지 않고, 승인/거절 결과가 기록된다.
- MCP Server tool로 memory 검색, Capsule 조회, 최근 게시물 요약을 호출할 수 있다.
- Notion MCP Client export는 사용자 승인 이후에만 실행된다.
- 허용되지 않은 다른 사용자의 게시물, memory, Capsule, AgentRun, MCP 호출 결과는 노출되지 않는다.

## 12. 후속 산출물

1. API 명세서: 요청/응답 JSON, 상태 코드, 공통 에러 포맷, 인증 방식 확정
2. ERD: 테이블, 관계, 인덱스, pgvector 컬럼, 삭제/비활성화 정책 확정
3. 아키텍처 문서: React, Spring Boot, FastAPI, PostgreSQL/pgvector, 친구 권한, MCP 책임 경계 확정
4. 화면 흐름도: 게시판, 친구, 좋아요, Memory Search, Capsule, Agent, 승인, MCP 관리 UI 흐름 확정
5. 개발 태스크 분해: P0 → P1 → P2 → P3 순서의 구현 단위 확정

## 13. 남은 검토 항목

- 인증 방식은 JWT 기반 stateless 방식으로 갈지, 세션 쿠키 기반으로 갈지 API 명세에서 결정한다.
- embedding 생성은 Spring Boot가 직접 호출할지 FastAPI 비동기 작업으로 분리할지 아키텍처 문서에서 결정한다.
- mock embedding provider와 실제 provider 전환 방식은 구현 전 확정한다.
- Capsule compact context의 정확한 JSON 구조는 API 명세에서 확정한다.
- MCP 인증과 scope 모델은 MCP 명세 작성 시 별도 검토한다.
- 친구 게시글 조회 범위 파라미터는 API 명세에서 `me`, `friends`, `all_accessible` 중 어떤 형태로 노출할지 확정한다.
- 친구 AI 활용 전역 동의는 MVP 기본값 false로 두고, 친구별/게시글별 동의는 후속 확장으로 둔다.
- README는 구현 범위가 확정된 뒤 최종 문서 업데이트 단계에서 동기화한다.

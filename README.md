# Baseball AI Board

RAG, MCP, AI Agent를 활용해 야구 경기 리뷰와 이슈 브리핑을 돕는 AI 게시판입니다.

사용자는 야구 경기 리뷰, 선수 분석, 팀 이슈, 뉴스 브리핑 게시글을 작성하고 댓글, 태그, 검색, 페이지네이션으로 게시판을 사용할 수 있습니다. AI 기능은 기존 게시글 기반 유사 글 추천, 외부 뉴스/URL 브리핑, 경기 리뷰 작성 보조를 제공합니다.

## 1. 프로젝트 개요

Baseball AI Board는 야구 팬들이 경기 리뷰와 야구 이슈를 기록하고 공유하는 커뮤니티형 게시판입니다.

단순 CRUD 게시판에 그치지 않고, 사용자가 글을 읽거나 작성하는 과정에서 AI가 다음 작업을 도와줍니다.

- 기존 게시글 중 의미적으로 비슷한 야구 글 추천
- 야구 뉴스 키워드 또는 외부 URL 기반 브리핑 생성
- 짧은 경기 메모를 게시글 초안으로 확장

## 2. 기술 스택

| 영역 | 선택 기술 | 사용 이유 |
| --- | --- | --- |
| Frontend | React + Next.js | React 컴포넌트로 게시판 화면과 AI 패널을 구성하고, 라우팅과 API를 같은 프로젝트에서 관리하기 위해 사용했습니다. |
| Backend | Next.js API Routes | 인증, 게시글, 댓글, 태그, AI API를 REST 흐름으로 구현해 프론트엔드와 백엔드를 단순하게 연결했습니다. |
| Language | TypeScript | 사용자, 게시글, 댓글, 태그, AI 응답 데이터를 타입으로 관리해 구현 실수를 줄였습니다. |
| Database | PostgreSQL | 관계형 게시판 데이터를 안정적으로 저장하고, RAG용 pgvector 확장을 함께 사용할 수 있어 선택했습니다. |
| ORM | Prisma | 데이터 모델, 관계, 마이그레이션을 코드 중심으로 관리하기 위해 사용했습니다. |
| Vector DB | PostgreSQL + pgvector | 별도 벡터 DB 없이 게시글 데이터와 임베딩 벡터를 같은 DB에서 관리했습니다. |
| RAG Framework | LangChain.js | OpenAI Embedding/Chat 모델과 RAG 흐름을 TypeScript 환경에서 연결하기 위해 사용했습니다. |
| LLM / Embedding | OpenAI API | 임베딩 생성, 요약, Function Calling을 하나의 API로 연결했습니다. |
| MCP | Node.js 기반 JSON-RPC 서버 | 외부 뉴스 검색과 URL 분석 도구를 JSON-RPC 규격으로 분리해 MCP 구조를 구현했습니다. |
| Agent | OpenAI Function Calling 기반 직접 구현 | 도구 선택, 실행 결과 반영, 상태 관리를 포함한 작은 추론 루프를 직접 구현했습니다. |
| Auth | JWT + HttpOnly Cookie | 로그인 토큰을 브라우저 JavaScript에서 직접 접근하지 못하게 해 인증 흐름을 구성했습니다. |
| Styling | Tailwind CSS | 별도 UI 프레임워크 없이 빠르게 일관된 화면 스타일을 구성했습니다. |

## 3. 주요 구현 기능

### 기본 게시판

- 회원가입
- 로그인 / 로그아웃
- 게시글 작성 / 조회 / 수정 / 삭제
- 댓글 작성 / 수정 / 삭제
- 태그 등록 / 조회 / 필터
- 게시글 검색
- 게시글 / 댓글 페이지네이션

### AI 기능

- RAG 기반 유사 야구 게시글 추천 및 요약
- MCP 기반 야구 뉴스 키워드 검색 / 외부 URL 브리핑
- AI Agent 기반 경기 리뷰 작성 도우미

## 4. 실행 방법

### 환경 요구사항

- Node.js
- PostgreSQL
- PostgreSQL pgvector 확장
- OpenAI API Key

### 환경 변수

`.env.example`을 참고해 프로젝트 루트에 `.env` 파일을 생성합니다.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/baseball_ai_board?schema=public"
AUTH_SECRET="replace-with-at-least-32-characters"
OPENAI_API_KEY="replace-with-openai-api-key"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
OPENAI_EMBEDDING_DIMENSIONS="1536"
OPENAI_CHAT_MODEL="gpt-4o-mini"
MCP_SHARED_SECRET="replace-with-optional-mcp-secret"
```

`MCP_SHARED_SECRET`은 선택값입니다. 설정하면 MCP JSON-RPC 엔드포인트 호출 시 `x-mcp-secret` 헤더로 같은 값을 전달해야 합니다.

### 로컬 실행

PowerShell에서는 `npm` 대신 `npm.cmd`를 사용합니다.

```bash
npm.cmd install
npm.cmd run db:migrate
npm.cmd run dev
```

개발 서버:

```text
http://localhost:3000
```

### 검증 명령

```bash
npm.cmd run lint
npm.cmd run build
npx.cmd prisma migrate status
```

## 5. 전체 아키텍처 구조

```mermaid
flowchart LR
    User["사용자"] --> Web["Next.js / React UI"]
    Web --> API["Next.js API Routes"]
    API --> Auth["JWT + HttpOnly Cookie"]
    API --> DB["PostgreSQL"]
    DB --> Vector["pgvector / PostEmbedding"]
    API --> OpenAI["OpenAI API"]
    API --> MCP["MCP JSON-RPC Server"]
    MCP --> External["Google News RSS / External URL"]
    API --> Agent["AI Agent Loop"]
    Agent --> OpenAI
    Agent --> DB
    Agent --> MCP
```

## 6. 데이터베이스 구조

| 모델 | 역할 |
| --- | --- |
| User | 사용자 계정, 이메일, 비밀번호 해시, 닉네임 저장 |
| Post | 게시글 제목, 본문, 작성자, 생성/수정 시간 저장 |
| Comment | 게시글 댓글과 작성자 정보 저장 |
| Tag | 게시글 태그 이름 저장 |
| PostTag | 게시글과 태그의 다대다 관계 저장 |
| PostEmbedding | 게시글 임베딩 벡터와 내용 해시 저장 |

RAG 검색을 위해 `PostEmbedding.embedding`은 `vector(1536)` 타입을 사용합니다.

## 7. API 구조

| API | 역할 |
| --- | --- |
| `/api/auth/signup` | 회원가입 |
| `/api/auth/login` | 로그인 |
| `/api/auth/logout` | 로그아웃 |
| `/api/auth/me` | 현재 로그인 사용자 조회 |
| `/api/posts` | 게시글 목록 조회 / 작성 |
| `/api/posts/[postId]` | 게시글 상세 조회 / 수정 / 삭제 |
| `/api/posts/[postId]/comments` | 댓글 목록 조회 / 작성 |
| `/api/comments/[commentId]` | 댓글 수정 / 삭제 |
| `/api/tags` | 태그 목록 조회 |
| `/api/ai/rag/similar-posts` | RAG 유사 게시글 추천 |
| `/api/mcp/baseball-briefing` | MCP JSON-RPC 서버 |
| `/api/ai/mcp/briefing` | MCP 브리핑 결과를 AI 응답으로 변환 |
| `/api/ai/agent/review-assistant` | Agent 경기 리뷰 작성 도우미 |

## 8. AI 기능 상세

### RAG: 유사 야구 게시글 추천 및 요약

게시글을 작성하거나 수정하면 제목, 본문, 태그를 하나의 지식 텍스트로 구성하고 OpenAI Embedding을 생성합니다. 생성된 벡터는 PostgreSQL `pgvector`를 통해 `PostEmbedding` 테이블에 저장됩니다.

게시글 상세 화면에서는 현재 게시글의 임베딩과 기존 게시글 임베딩을 비교해 의미적으로 유사한 글을 찾고, OpenAI Chat 모델로 추천 결과를 짧게 요약합니다.

```text
게시글 작성/수정
→ 제목 + 본문 + 태그를 지식 텍스트로 구성
→ OpenAI Embedding 생성
→ PostEmbedding 테이블에 vector(1536) 저장
→ 상세 화면에서 pgvector 유사도 검색
→ 유사 게시글 목록과 RAG 요약 표시
```

주요 파일:

- `src/lib/ai/rag.ts`
- `src/app/api/ai/rag/similar-posts/route.ts`
- `src/components/ai/similar-posts-panel.tsx`

### MCP: 야구 뉴스 / 외부 URL 브리핑

MCP 기능은 JSON-RPC 요청/응답 구조로 구현했습니다. Next.js 내부에 MCP 서버 엔드포인트를 두고, 도구 목록 조회와 도구 실행을 JSON-RPC 메서드로 처리합니다.

구현한 MCP 도구:

- `search_baseball_news`: 야구 키워드로 Google News RSS 검색
- `brief_external_url`: 외부 URL의 제목, 설명, 본문 일부 추출

보안/권한 전략:

- OpenAI API Key는 `.env`에서만 관리하고 GitHub에 올리지 않습니다.
- `MCP_SHARED_SECRET`을 설정하면 MCP 서버 직접 호출 시 `x-mcp-secret` 헤더 검증을 수행합니다.
- 외부 URL 브리핑은 `localhost`, 사설 IP, local 도메인을 차단해 내부망 접근을 방지합니다.

```text
사용자 키워드 또는 URL 입력
→ /api/ai/mcp/briefing
→ /api/mcp/baseball-briefing JSON-RPC 호출
→ MCP tool 실행
→ 외부 뉴스 RSS 또는 URL 데이터 수집
→ OpenAI Chat 모델로 게시글 브리핑 생성
→ 화면에 브리핑과 출처 표시
```

주요 파일:

- `src/lib/mcp/json-rpc.ts`
- `src/lib/mcp/baseball-briefing-tools.ts`
- `src/app/api/mcp/baseball-briefing/route.ts`
- `src/lib/ai/mcp-briefing.ts`
- `src/components/ai/mcp-briefing-panel.tsx`

### Agent: 경기 리뷰 작성 도우미

Agent는 사용자의 경기 메모를 받아 필요한 도구를 선택하고 실행한 뒤, 실행 결과를 memory/state에 반영해 최종 경기 리뷰 초안을 생성합니다.

Agent 도구:

- `recommend_review_tags`: 경기 메모 기반 태그 추천
- `search_board_posts`: 기존 게시글 검색
- `fetch_baseball_news_briefing`: MCP 뉴스 브리핑 호출

추론 루프 안정성:

- Function Calling 기반 도구 선택
- Agent state/memory 유지
- 최대 반복 횟수 3회 제한
- 같은 도구와 같은 인자의 반복 호출 방지
- 도구 실패 시 fallback 초안 반환

```text
사용자 경기 메모 입력
→ LLM이 필요한 도구 선택
→ 도구 실행
→ 실행 결과를 Agent memory에 저장
→ 최대 3회까지 반복
→ 추천 제목, 태그, 리뷰 초안, 보완 체크리스트 반환
```

주요 파일:

- `src/lib/ai/review-agent.ts`
- `src/app/api/ai/agent/review-assistant/route.ts`
- `src/components/ai/review-agent-panel.tsx`

## 9. 데모

### 데모 시나리오

1. 사용자가 회원가입 후 로그인합니다.
2. 야구 경기 리뷰 게시글을 작성하고 태그를 등록합니다.
3. 게시글 상세 화면에서 RAG 유사 게시글 추천과 요약을 확인합니다.
4. 홈 화면의 MCP 패널에서 야구 키워드 또는 뉴스 URL로 브리핑을 생성합니다.
5. Agent 패널에 짧은 경기 메모를 입력해 추천 제목, 태그, 리뷰 초안, 체크리스트를 생성합니다.
6. 생성된 초안을 바탕으로 게시글을 작성하고 댓글을 남깁니다.

### 스크린샷

![Baseball AI Board demo](docs/screenshots/baseball-ai-board-demo.png)

## 10. 검증 결과

현재 로컬 환경에서 아래 항목을 확인했습니다.

- `npm.cmd run lint` 통과
- `npm.cmd run build` 통과
- `npx.cmd prisma migrate status` 기준 DB schema 최신 상태
- PostgreSQL `pgvector 0.8.2` 확장 확인
- `PostEmbedding` 테이블 생성 확인
- 주요 페이지 `/`, `/login`, `/signup`, `/posts/new` 응답 확인
- MCP JSON-RPC `tools/list` 응답 확인
- OpenAI Embedding / Chat 호출을 통한 RAG 흐름 확인
- AI Agent API 호출 및 도구 실행 기록 반환 확인

## 11. 회고, 한계점, 개선 아이디어

### 회고

이번 프로젝트에서는 프론트엔드, 백엔드, DB, AI 응용 기능을 하나의 서비스 흐름으로 연결했습니다. 게시판 기본 기능을 먼저 안정화한 뒤 RAG, MCP, Agent를 순서대로 붙이면서 AI 기능이 단순한 API 호출이 아니라 실제 사용자 흐름 안에서 어떤 역할을 해야 하는지 확인할 수 있었습니다.

### 한계점

- OpenAI API 사용량에 따라 비용이 발생합니다.
- RAG 추천 품질은 게시글 수와 게시글 내용 품질에 영향을 받습니다.
- KBO 공식 경기 데이터 API가 명확하지 않아 실시간 경기 기록은 직접 연동하지 않았습니다.
- Google News RSS와 외부 URL 수집은 사이트 구조, 네트워크 상태, 접근 제한에 따라 실패할 수 있습니다.
- Agent는 직접 구현한 작은 추론 루프이므로 복잡한 장기 상태 관리에는 한계가 있습니다.

### 개선 아이디어

- 사용자별 관심 팀/선수 기반 개인화 추천
- 게시판 전체 흐름을 요약하는 야구 트렌드 리포트
- 공식 스포츠 데이터 API를 활용한 경기 일정/결과 브리핑
- 관리자용 AI 모더레이션 기능
- LangGraph 기반 Agent 상태 관리 고도화
- AI 호출 로그와 Agent 실행 이력 저장 테이블 추가

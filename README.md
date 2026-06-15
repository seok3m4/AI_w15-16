# Baseball AI Board

KBO 야구 팬들이 경기 리뷰, 선수 분석, 팀 이슈, 뉴스 브리핑을 작성하고 공유할 수 있는 야구 커뮤니티 게시판입니다.

기본 게시판 기능 위에 RAG, MCP, AI Agent 기능을 붙여서 사용자가 글을 작성하거나 경기 정보를 확인할 때 AI가 자연스럽게 보조하도록 구성했습니다.

## 1. 프로젝트 개요

Baseball AI Board는 단순 CRUD 게시판이 아니라, 실제 야구 커뮤니티에서 사용할 법한 흐름을 목표로 만든 웹 애플리케이션입니다.

사용자는 게시글과 댓글을 작성하고, 태그/검색/페이지네이션으로 글을 탐색할 수 있습니다. 여기에 KBO 경기 정보, 뉴스, 순위, 경기방, 문자중계, 추천/비추천, 인기글 기능을 더해 야구 게시판에 가까운 사용 경험을 만들었습니다.

AI 기능은 다음 세 방향으로 구성했습니다.

- RAG: 게시판 내부 글을 기반으로 유사 글 추천, 중복 글 방지, 경기별 관련 글 요약 제공
- MCP: 외부 KBO 경기 데이터, 공식 기록, 뉴스 URL을 도구처럼 조회하고 브리핑 제공
- Agent: 경기 리뷰 초안 생성, 자율 운영 모더레이터, 승부 예측 제공

## 2. 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React, Next.js |
| Backend | Next.js API Routes |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Vector DB | PostgreSQL + pgvector |
| RAG Framework | LangChain.js |
| LLM / Embedding | OpenAI API |
| MCP | Node.js 기반 JSON-RPC 구조 |
| Agent | Function Calling 기반 직접 구현 |
| Auth | JWT + HttpOnly Cookie |

### 선택 이유

- Next.js: React 화면과 API 서버를 한 프로젝트에서 관리할 수 있어 개인 프로젝트 규모에 적합했습니다.
- PostgreSQL: 게시판 데이터와 pgvector 기반 임베딩 데이터를 함께 저장할 수 있어 RAG 구현에 적합했습니다.
- Prisma: DB 모델과 TypeScript 코드를 안정적으로 연결하고 마이그레이션을 관리하기 위해 사용했습니다.
- LangChain.js: OpenAI Embedding/Chat 모델을 이용한 RAG 흐름을 구조화하기 위해 사용했습니다.
- OpenAI API: 임베딩 생성, 요약, 브리핑, 리뷰 초안 생성, 모더레이션 보강에 사용했습니다.
- MCP(JSON-RPC): 외부 KBO 데이터와 뉴스 URL을 LLM이 사용할 수 있는 도구 형태로 분리하기 위해 사용했습니다.

## 3. 주요 구현 기능

### 기본 게시판

- 회원가입 / 로그인 / 로그아웃
- JWT + HttpOnly Cookie 기반 인증
- 게시글 작성 / 조회 / 수정 / 삭제
- 댓글 작성 / 조회 / 수정 / 삭제
- 태그 등록 및 다중 태그 필터
- 검색
- 페이지네이션
- 조회수
- 추천 / 비추천
- 조회수 기반 인기글
- 글쓰기 페이지 기존 태그 선택
- 게시글 수 0개인 태그 숨김

### 야구 커뮤니티 기능

- KBO 공식 뉴스 페이지
- KBO 팀 순위 패널
- 오늘의 경기 목록
- 경기방
- 경기별 선발 투수 표시
- 종료 경기 승리/패전/세이브 투수 표시
- 경기방 라인업 조회
- 네이버 문자중계 연동
- 문자중계 1회~9회 이닝별 조회
- 경기방 관련 게시글 목록

### AI 기능

- RAG 유사 게시글 추천
- RAG 글쓰기 중복 글 방지 알림
- RAG 경기/팀별 관련 글 묶음 요약
- MCP KBO 경기 일정/결과 조회
- MCP KBO 공식 기록 브리핑
- MCP 뉴스/URL 브리핑
- Agent 경기 리뷰 작성 도우미
- Agent 자율 운영 모더레이터
- Agent 경기 승부 예측

## 4. 전체 아키텍처

```mermaid
flowchart LR
    User["사용자"] --> UI["Next.js / React UI"]
    UI --> API["Next.js API Routes"]
    API --> Auth["JWT + HttpOnly Cookie"]
    API --> DB["PostgreSQL"]
    DB --> Vector["pgvector / PostEmbedding"]
    API --> OpenAI["OpenAI API"]
    API --> MCP["MCP JSON-RPC Tools"]
    MCP --> KBO["KBO 공식 경기/뉴스/기록"]
    MCP --> News["Google News RSS / 외부 URL"]
    API --> Naver["네이버 스포츠 문자중계/라인업"]
    API --> Agent["AI Agent Logic"]
    Agent --> OpenAI
    Agent --> DB
    Agent --> MCP
```

### 데이터 흐름

```text
사용자 요청
-> React 화면
-> Next.js API Route
-> Prisma
-> PostgreSQL
-> 필요 시 OpenAI / KBO / 뉴스 URL / 네이버 스포츠 호출
-> 결과를 화면에 표시
```

## 5. 데이터베이스 구조

| 모델 | 역할 |
| --- | --- |
| User | 사용자 계정, 이메일, 비밀번호 해시, 닉네임 |
| Post | 게시글 제목, 본문, 작성자, 조회수 |
| Comment | 게시글 댓글 |
| Tag | 태그 이름 |
| PostTag | 게시글과 태그의 다대다 관계 |
| PostVote | 추천/비추천 |
| PostEmbedding | 게시글 임베딩 벡터와 content hash |

RAG 검색을 위해 `PostEmbedding.embedding`은 PostgreSQL `pgvector`의 `vector(1536)` 타입을 사용합니다.

## 6. RAG 기능

RAG는 게시판 내부 데이터를 LLM에 연결하는 기능입니다.

### 구현 기능

1. 유사 게시글 추천
   - 게시글 상세에서 현재 글과 비슷한 기존 글을 추천합니다.

2. 글쓰기 중복 글 방지
   - 글쓰기 페이지에서 작성 중인 제목, 본문, 태그를 기준으로 기존 글과 유사도를 비교합니다.
   - 유사도가 높으면 중복 가능성을 안내합니다.

3. 경기/팀별 관련 글 묶음 요약
   - 경기방에서 팀 태그와 경기 관련 태그를 기준으로 관련 글을 모읍니다.
   - 여러 게시글의 공통 의견과 쟁점을 요약합니다.

### RAG 흐름

```text
게시글 작성/수정
-> 제목 + 본문 + 태그를 지식 텍스트로 구성
-> OpenAI Embedding 생성
-> PostgreSQL pgvector에 저장
-> 유사도 검색
-> LLM에 검색 결과 전달
-> 유사 글 요약 또는 관련 글 묶음 요약 생성
```

### 주요 파일

```text
src/lib/ai/rag.ts
src/app/api/ai/rag/similar-posts/route.ts
src/app/api/ai/rag/draft-similar-posts/route.ts
src/app/api/ai/rag/related-post-summary/route.ts
src/components/ai/similar-posts-panel.tsx
src/components/ai/related-post-summary-panel.tsx
```

## 7. MCP 기능

MCP는 외부 데이터를 LLM이 사용할 수 있는 도구처럼 연결하는 구조로 구현했습니다.

### 구현 도구

| Tool | 역할 |
| --- | --- |
| `get_kbo_games` | KBO 공식 경기 일정/결과 조회 |
| `brief_kbo_game_record` | KBO 공식 스코어보드/박스스코어 기반 기록 브리핑 |
| `search_baseball_news` | 야구 뉴스 검색 |
| `brief_external_url` | 외부 URL 내용 요약/브리핑 |

### JSON-RPC 구조

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_kbo_games",
    "arguments": {
      "date": "2026-06-14"
    }
  },
  "id": 1
}
```

### 외부 연동

- KBO 공식 경기 일정/결과
- KBO 공식 스코어보드/박스스코어
- KBO 공식 뉴스
- Google News RSS
- 외부 뉴스 URL

### 보안/권한 관리

- OpenAI API Key는 `.env`에서만 관리하고 GitHub에는 올리지 않습니다.
- `MCP_SHARED_SECRET`을 설정하면 MCP 직접 호출 시 `x-mcp-secret` 헤더를 검증합니다.
- 외부 URL 브리핑은 `localhost`, 사설 IP, local domain 접근을 차단해 SSRF 위험을 줄였습니다.

### 주요 파일

```text
src/lib/mcp/json-rpc.ts
src/lib/mcp/baseball-briefing-tools.ts
src/app/api/mcp/baseball-briefing/route.ts
src/app/api/ai/mcp/briefing/route.ts
src/app/api/ai/mcp/kbo-games/route.ts
src/app/api/ai/mcp/kbo-game-record/route.ts
```

## 8. AI Agent 기능

Agent는 단순 LLM 호출이 아니라, 목표에 맞게 도구를 선택하고 실행 결과를 반영하는 흐름으로 구현했습니다.

### 경기 리뷰 작성 도우미

사용자가 경기 메모를 입력하면 다음 정보를 활용해 리뷰 초안을 생성합니다.

- 사용자 메모
- 팀/날짜 정보
- 기존 게시글 검색 결과
- KBO 경기 결과
- KBO 공식 기록 브리핑
- 뉴스 브리핑

### 자율 운영 모더레이터

게시글과 댓글 작성/수정 시 내용을 검사합니다.

판정 결과:

- `allow`: 정상 작성 허용
- `warn`: 경고 후 사용자가 확인하면 작성 가능
- `block`: 인신공격, 개인정보, 심한 표현 등을 차단

검사 항목:

- 욕설/과격한 표현
- 특정 대상 인신공격
- 스팸성 링크/반복 문자
- 전화번호/이메일 등 개인정보

### 경기 승부 예측

경기방에서 아직 종료되지 않은 경기에 대해 승부 예측을 제공합니다.

반영 데이터:

- 경기 정보
- 선발 투수
- 팀 순위
- 라인업 공개 시 타자 라인업
- 외부 경기 데이터

종료된 경기에는 승부 예측 버튼을 숨깁니다.

### Agent 안정화 전략

- Function Calling 기반 도구 선택
- state/memory 유지
- 최대 반복 횟수 제한
- 같은 도구 반복 호출 방지
- 도구 실패 시 fallback 응답 제공
- 모더레이터는 규칙 기반 판정을 우선하고 LLM은 설명 보강에 사용

### 주요 파일

```text
src/lib/ai/review-agent.ts
src/lib/ai/moderation-agent.ts
src/lib/ai/moderation-rules.ts
src/lib/ai/game-prediction.ts
src/app/api/ai/agent/review-assistant/route.ts
src/app/api/ai/agent/moderation/route.ts
src/app/api/ai/prediction/game/route.ts
```

## 9. 주요 API

| API | 역할 |
| --- | --- |
| `/api/auth/signup` | 회원가입 |
| `/api/auth/login` | 로그인 |
| `/api/auth/logout` | 로그아웃 |
| `/api/auth/me` | 현재 사용자 조회 |
| `/api/posts` | 게시글 목록 조회 / 작성 |
| `/api/posts/[postId]` | 게시글 상세 조회 / 수정 / 삭제 |
| `/api/posts/[postId]/comments` | 댓글 목록 조회 / 작성 |
| `/api/posts/[postId]/views` | 조회수 증가 |
| `/api/posts/[postId]/votes` | 추천 / 비추천 |
| `/api/comments/[commentId]` | 댓글 수정 / 삭제 |
| `/api/tags` | 태그 목록 조회 |
| `/api/kbo/news` | KBO 공식 뉴스 조회 |
| `/api/kbo/standings` | KBO 팀 순위 조회 |
| `/api/kbo/lineup` | 경기 라인업 조회 |
| `/api/kbo/relay` | 네이버 문자중계 조회 |
| `/api/ai/rag/similar-posts` | RAG 유사 게시글 추천 |
| `/api/ai/rag/draft-similar-posts` | 글쓰기 중복 글 확인 |
| `/api/ai/rag/related-post-summary` | 경기/팀별 관련 글 요약 |
| `/api/mcp/baseball-briefing` | MCP JSON-RPC 서버 |
| `/api/ai/mcp/briefing` | 뉴스/URL 브리핑 |
| `/api/ai/mcp/kbo-games` | KBO 경기 일정/결과 조회 |
| `/api/ai/mcp/kbo-game-record` | KBO 공식 기록 브리핑 |
| `/api/ai/agent/review-assistant` | 경기 리뷰 작성 도우미 |
| `/api/ai/agent/moderation` | 자율 운영 모더레이터 |
| `/api/ai/prediction/game` | 경기 승부 예측 |

## 10. 실행 방법

### 요구 사항

- Node.js
- PostgreSQL
- PostgreSQL pgvector 확장
- OpenAI API Key

### 환경 변수

프로젝트 루트에 `.env` 파일을 생성합니다. `.env.example`을 참고하면 됩니다.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/baseball_ai_board?schema=public"
AUTH_SECRET="replace-with-at-least-32-characters"
OPENAI_API_KEY="replace-with-openai-api-key"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
OPENAI_EMBEDDING_DIMENSIONS="1536"
OPENAI_CHAT_MODEL="gpt-4o-mini"
MCP_SHARED_SECRET="replace-with-optional-mcp-secret"
```

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

### 데모 데이터

```bash
npm.cmd run seed:demo-posts
```

### 검증 명령

```bash
npm.cmd run lint
npm.cmd run build
npx.cmd prisma migrate status
```

## 11. 데모

### 데모 화면

![Baseball AI Board 데모 화면](docs/screenshots/baseball-ai-board-demo.png)

### 추천 시연 흐름

1. 메인 화면에서 게시글 목록, 인기글, 태그, KBO 순위, 오늘의 경기 확인
2. 경기방에서 경기 정보, 선발/승패/세이브 투수, 라인업, 문자중계 확인
3. 문자중계에서 1회~9회 이닝별 중계 선택
4. 경기방에서 관련 글 요약 실행
5. 글쓰기 페이지에서 기존 태그 선택 및 유사 글 확인
6. Agent 경기 리뷰 초안 생성
7. 뉴스 페이지에서 KBO 뉴스 확인 및 URL 브리핑 실행
8. 댓글 작성 시 모더레이터 경고/차단 흐름 확인

### RAG / MCP / Agent 시연 구분

| 시연 | 분류 |
| --- | --- |
| 글쓰기 유사 게시글 확인 | RAG |
| 경기방 관련 글 요약 | RAG |
| 뉴스 URL 브리핑 | MCP |
| KBO 경기 정보 / 공식 기록 브리핑 | MCP |
| 경기 리뷰 초안 생성 | Agent |
| 댓글 모더레이터 | Agent |
| 승부 예측 | Agent |

## 12. 검증 결과

현재 로컬 환경에서 다음 항목을 확인했습니다.

- `npm.cmd run lint` 통과
- `npm.cmd run build` 통과
- PostgreSQL / Prisma migration 적용
- pgvector 기반 `PostEmbedding` 저장 확인
- 게시글 CRUD 확인
- 댓글 CRUD 확인
- 태그 필터와 다중 태그 선택 확인
- 추천/비추천 확인
- KBO 뉴스 조회 확인
- KBO 순위 조회 확인
- KBO 경기 정보 조회 확인
- 문자중계 이닝별 조회 로직 확인
- RAG 유사 글 추천 확인
- RAG 관련 글 요약 확인
- MCP JSON-RPC tool 호출 구조 확인
- Agent 리뷰 초안 생성 확인
- Agent 모더레이터 allow/warn/block 판정 확인

## 13. 회고와 한계점

### 회고

이번 프로젝트에서는 프론트엔드, 백엔드, DB, AI 기능을 하나의 서비스 흐름으로 연결하는 경험을 했습니다.

처음에는 AI 기능을 단순히 붙이는 데 집중했지만, 구현이 진행될수록 실제 커뮤니티 사용자가 자연스럽게 사용할 수 있는 위치에 AI 기능을 배치하는 것이 더 중요하다는 점을 느꼈습니다.

그래서 화면에는 야구 커뮤니티 흐름을 먼저 보여주고, 필요한 순간에 RAG, MCP, Agent가 보조하도록 구성했습니다.

### 한계점

- OpenAI API 사용량에 따라 비용이 발생합니다.
- RAG 품질은 게시글 수와 게시글 내용 품질에 영향을 받습니다.
- KBO 공식 웹 페이지 구조가 바뀌면 파서 수정이 필요할 수 있습니다.
- 네이버 문자중계/라인업 구조가 바뀌면 외부 데이터 연동 수정이 필요할 수 있습니다.
- 승부 예측은 실제 예측 모델이 아니라 경기 정보와 규칙/LLM 기반 브리핑이므로 참고용입니다.
- Agent는 직접 구현한 간단한 추론 루프라 LangGraph 같은 전문 프레임워크 대비 상태 관리가 제한적입니다.

### 개선 아이디어

- 사용자별 관심 팀 기반 개인화 추천
- 경기별 리뷰 템플릿 자동 생성 강화
- 댓글 반응과 추천/비추천 기반 인기글 랭킹 고도화
- 관리자용 모더레이션 대시보드
- Agent 실행 로그 저장
- LangGraph 기반 Agent 상태 관리 고도화
- RAG 검색 결과 평가 지표 추가
- 모바일 UI 개선
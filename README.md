# KBO Talk

KBO Talk는 KBO 경기 리뷰, 팀 이슈, 선수 기록, 야구 뉴스 이야기를 한곳에서 나눌 수 있는 야구 커뮤니티 게시판입니다.

단순 게시판 기능 위에 RAG, MCP, AI Agent를 붙여서 사용자가 글을 작성하거나 경기 정보를 확인할 때 필요한 도움을 자연스럽게 받을 수 있도록 구성했습니다. 화면에서는 AI 용어를 크게 드러내기보다 `유사 글`, `뉴스 브리핑`, `리뷰 초안`, `야구 도우미`처럼 실제 사용 흐름에 가까운 기능으로 보여주는 것을 목표로 했습니다.

## 1. 프로젝트 개요

이 프로젝트는 개인이 프론트엔드, 백엔드, 데이터베이스, AI 응용 기능을 모두 직접 설계하고 구현하는 것을 목표로 만든 KBO 야구 게시판입니다.

사용자는 회원가입과 로그인 후 게시글과 댓글을 작성할 수 있고, 태그, 검색, 페이지네이션, 추천/비추천, 조회수 기반 인기글을 통해 일반 커뮤니티처럼 게시판을 사용할 수 있습니다. 여기에 KBO 일정/결과, 순위, 기록실, 뉴스, 경기방을 연결해 야구 커뮤니티에 가까운 사용 경험을 만들었습니다.

AI 기능은 다음 세 가지 축으로 구성했습니다.

- RAG: 기존 게시글을 벡터 검색해 유사 글 추천, 중복 글 방지, 경기/팀별 관련 글 요약 제공
- MCP: 외부 KBO 경기 데이터, 공식 기록, 뉴스 URL을 JSON-RPC 도구처럼 호출해 브리핑 제공
- AI Agent: 경기 리뷰 초안 생성, 게시글/댓글 모더레이션, 야구 게시판 도우미, 경기 승부 예측 제공

## 2. 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React, Next.js App Router |
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

- Next.js는 React 화면과 API 서버를 한 프로젝트에서 관리할 수 있어 개인 프로젝트 규모에 적합하다고 판단했습니다.
- PostgreSQL은 게시판 데이터 저장뿐 아니라 pgvector를 이용한 벡터 검색까지 한 DB에서 처리할 수 있어 RAG 구현에 유리했습니다.
- Prisma는 DB 모델, 마이그레이션, TypeScript 타입을 안정적으로 연결하기 위해 사용했습니다.
- LangChain.js는 OpenAI Embedding과 Chat 모델을 연결해 RAG 흐름을 구조화하기 좋았습니다.
- MCP는 외부 야구 데이터와 URL 분석 기능을 LLM이 호출 가능한 도구 형태로 분리하기 위해 JSON-RPC 구조로 구현했습니다.

## 3. 주요 구현 기능

### 기본 게시판

- 회원가입, 로그인, 로그아웃
- JWT + HttpOnly Cookie 기반 인증
- 게시글 작성, 조회, 수정, 삭제
- 댓글 작성, 조회, 수정, 삭제
- 태그 생성 및 다중 태그 필터
- 검색과 페이지네이션
- 게시글 조회수
- 추천/비추천
- 조회수 기반 인기글
- 게시글 목록 밀도 조절
- 글쓰기 페이지의 기존 태그 선택
- 태그 0개 항목 숨김 처리

### 야구 커뮤니티 기능

- 메인 화면 KBO 오늘의 경기 스코어보드
- 경기방: 경기별 상세 화면
- 경기방 선발 투수, 승리 투수, 패전 투수, 세이브 투수 표시
- 경기방 라인업 조회
- 경기방 1회부터 9회까지 문자중계 조회
- 경기방 관련 게시글 요약
- KBO 팀 순위 표시
- 선수 기록실 페이지
- KBO 뉴스 페이지
- 뉴스 URL 브리핑 연결
- 조회수 기반 인기글
- 데모용 경기 리뷰 게시글 데이터

### AI 활용 기능

- RAG 기반 유사 게시글 추천
- RAG 기반 글쓰기 중복 글 방지 알림
- RAG 기반 경기/팀별 관련 글 묶음 요약
- MCP 기반 KBO 경기 일정/결과 조회
- MCP 기반 KBO 공식 기록 브리핑
- MCP 기반 뉴스/외부 URL 브리핑
- Agent 기반 경기 리뷰 초안 작성 도우미
- Agent 기반 자율 운영 모더레이터
- Agent 기반 야구 게시판 도우미 챗봇
- Agent 기반 경기 승부 예측

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
    MCP --> KBO["KBO 공식 경기/기록 데이터"]
    MCP --> News["뉴스 RSS / 외부 URL"]
    API --> Naver["네이버 스포츠 문자중계/기록 데이터"]
    API --> Agent["Agent Logic"]
    Agent --> DB
    Agent --> OpenAI
    Agent --> MCP
```

### 데이터 흐름

```text
사용자 요청
-> React 화면
-> Next.js API Route
-> Prisma
-> PostgreSQL
-> 필요한 경우 OpenAI / MCP Tool / KBO / 네이버 스포츠 데이터 호출
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
| PostVote | 게시글 추천/비추천 |
| PostEmbedding | 게시글 임베딩 벡터와 content hash |

RAG 검색을 위해 `PostEmbedding.embedding`은 PostgreSQL pgvector의 `vector(1536)` 타입을 사용합니다.

## 6. RAG 기능

RAG는 게시판 내부 게시글을 검색 가능한 지식 소스로 만들고, LLM이 그 검색 결과를 바탕으로 답변하거나 요약할 수 있게 하는 구조입니다.

### 구현 기능

1. 유사 게시글 추천
   - 게시글 상세 화면에서 사용자가 원할 때 기존 게시글 중 유사한 글을 확인할 수 있습니다.
   - 유사도와 함께 제목, 요약, 태그를 보여줍니다.

2. 글쓰기 중복 글 방지 알림
   - 글쓰기 페이지에서 제목, 본문, 태그를 기준으로 기존 게시글과 유사도를 확인합니다.
   - 이미 비슷한 글이 있으면 작성 전에 참고할 수 있도록 보여줍니다.

3. 경기/팀별 관련 글 묶음 요약
   - 경기방에서 해당 경기나 팀과 관련된 게시글을 모아 커뮤니티 반응을 요약합니다.
   - 게시글 본문과 태그를 근거로 공통 의견과 쟁점을 정리합니다.

### RAG 처리 흐름

```text
게시글 작성/수정
-> 제목 + 본문 + 태그를 지식 텍스트로 구성
-> OpenAI Embedding 생성
-> PostgreSQL pgvector 저장
-> 유사도 검색
-> 검색 결과를 LLM context로 전달
-> 유사 글 요약 또는 관련 글 요약 생성
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

MCP는 외부 시스템을 LLM이 사용할 수 있는 도구 형태로 연결하기 위해 구현했습니다. 이 프로젝트에서는 JSON-RPC 기반 MCP 서버와 도구 호출 구조를 직접 만들었습니다.

### 구현 도구

| Tool | 역할 |
| --- | --- |
| `get_kbo_games` | KBO 공식 경기 일정/결과 조회 |
| `brief_kbo_game_record` | KBO 공식 스코어보드/박스스코어 기반 기록 브리핑 |
| `search_baseball_news` | 야구 뉴스 검색 |
| `brief_external_url` | 외부 URL 제목, 설명, 본문 일부 추출 |

### JSON-RPC 요청 예시

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_kbo_games",
    "arguments": {
      "date": "2026-06-16"
    }
  },
  "id": 1
}
```

### 실제 외부 서비스 연동

- KBO 공식 경기 일정/결과 페이지
- KBO 공식 스코어보드/박스스코어 데이터
- Google News RSS
- 외부 뉴스 URL

네이버 스포츠 문자중계, 라인업, 선수 기록실은 별도 API Route로 연결해 경기방과 기록실에서 사용합니다.

### 보안 및 권한 관리

- OpenAI API Key와 DB 접속 정보는 `.env`에서만 관리하고 GitHub에 올리지 않습니다.
- `MCP_SHARED_SECRET`을 설정하면 MCP 직접 호출 시 `x-mcp-secret` 헤더로 검증합니다.
- 외부 URL 브리핑은 localhost, 사설 IP, local domain 접근을 막아 SSRF 위험을 줄였습니다.

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

Agent는 단순히 LLM을 한 번 호출하는 기능이 아니라, 목적에 맞게 도구를 선택하고 실행 결과를 반영하는 흐름으로 구현했습니다.

### 경기 리뷰 작성 도우미

사용자가 경기 메모, 응원 팀, 날짜를 입력하면 리뷰 초안을 생성합니다.

활용 정보:

- 사용자의 경기 메모
- KBO 경기 일정/결과
- KBO 공식 기록 브리핑
- 기존 게시글 검색 결과
- 뉴스 브리핑

### 자율 운영 모더레이터

게시글과 댓글 작성/수정 시 내용을 검사합니다.

판정 결과:

- `allow`: 정상 작성 허용
- `warn`: 경고 후 작성 가능
- `block`: 인신공격, 개인정보, 심한 욕설, 스팸 등을 차단

검사 항목:

- 욕설과 공격적 표현
- 특정 대상 인신공격
- 스팸성 링크와 반복 문자
- 전화번호, 이메일 등 개인정보

### 야구 게시판 도우미

메인 오른쪽 사이드바에서 사용할 수 있는 챗봇형 도우미입니다. 게시글, 인기글, 순위표, 기록실, 경기방, 뉴스 정보를 참고해 질문에 답합니다.

예시 질문:

- 오늘 경기 결과 알려줘
- KIA 관련 글 요약해줘
- 구창모 선수 기록 알려줘
- 타율 1등은 누구야?

### 경기 승부 예측

경기방에서 아직 종료되지 않은 경기의 관전 포인트와 예측을 제공합니다.

반영 정보:

- 경기 정보
- 선발 투수
- 팀 순위
- 라인업 공개 시 타자 라인업
- 최근 확인 가능한 경기 데이터

종료된 경기에는 승부 예측 버튼을 숨깁니다.

### Agent 안정성 전략

- Function Calling 기반 도구 선택
- 상태와 실행 결과를 memory로 관리
- 최대 반복 횟수 제한
- 같은 도구 반복 호출 방지
- 도구 실패 시 fallback 응답 제공
- 모더레이션은 규칙 기반 판정을 우선하고 LLM은 보조 판단으로 사용

### 주요 파일

```text
src/lib/ai/review-agent.ts
src/lib/ai/moderation-agent.ts
src/lib/ai/moderation-rules.ts
src/lib/ai/board-assistant-agent.ts
src/lib/ai/game-prediction.ts
src/app/api/ai/agent/review-assistant/route.ts
src/app/api/ai/agent/moderation/route.ts
src/app/api/ai/agent/board-assistant/route.ts
src/app/api/ai/prediction/game/route.ts
```

## 9. 주요 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 게시글 목록, 팀/태그 필터, 오늘의 경기, 인기글, 야구 도우미 |
| `/posts/new` | 게시글 작성, 태그 선택, 유사 글 확인, 리뷰 초안 생성 |
| `/posts/[postId]` | 게시글 상세, 댓글, 추천/비추천, 유사 글 추천 |
| `/posts/[postId]/edit` | 게시글 수정 |
| `/games/[gameId]` | 경기방, 라인업, 문자중계, 관련 글 요약, 공식 기록 브리핑 |
| `/news` | KBO 뉴스 목록과 URL 브리핑 |
| `/records` | 선수 기록실 |
| `/login` | 로그인 |
| `/signup` | 회원가입 |

## 10. 주요 API

| API | 역할 |
| --- | --- |
| `/api/auth/signup` | 회원가입 |
| `/api/auth/login` | 로그인 |
| `/api/auth/logout` | 로그아웃 |
| `/api/auth/me` | 현재 사용자 조회 |
| `/api/posts` | 게시글 목록 조회 / 작성 |
| `/api/posts/[postId]` | 게시글 상세 조회 / 수정 / 삭제 |
| `/api/posts/[postId]/comments` | 댓글 목록 조회 / 작성 |
| `/api/comments/[commentId]` | 댓글 수정 / 삭제 |
| `/api/posts/[postId]/views` | 조회수 증가 |
| `/api/posts/[postId]/votes` | 추천 / 비추천 |
| `/api/tags` | 태그 목록 조회 |
| `/api/kbo/news` | KBO 뉴스 조회 |
| `/api/kbo/standings` | KBO 순위 조회 |
| `/api/kbo/player-records` | 선수 기록 조회 |
| `/api/kbo/lineup` | 경기 라인업 조회 |
| `/api/kbo/relay` | 네이버 문자중계 조회 |
| `/api/mcp/baseball-briefing` | MCP JSON-RPC 서버 |
| `/api/ai/mcp/briefing` | 뉴스/URL 브리핑 |
| `/api/ai/mcp/kbo-games` | KBO 경기 일정/결과 조회 |
| `/api/ai/mcp/kbo-game-record` | KBO 공식 기록 브리핑 |
| `/api/ai/rag/similar-posts` | 유사 게시글 추천 |
| `/api/ai/rag/draft-similar-posts` | 글쓰기 중복 글 확인 |
| `/api/ai/rag/related-post-summary` | 관련 글 묶음 요약 |
| `/api/ai/agent/review-assistant` | 경기 리뷰 작성 도우미 |
| `/api/ai/agent/moderation` | 모더레이션 |
| `/api/ai/agent/board-assistant` | 야구 게시판 도우미 |
| `/api/ai/prediction/game` | 경기 승부 예측 |

## 11. 실행 방법

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

## 12. 데모

### 데모 화면

![KBO Talk 데모 화면](docs/screenshots/baseball-ai-board-demo.png)

### 추천 시연 흐름

1. 메인 화면에서 게시글 목록, 오늘의 경기, 팀/태그 필터, 인기글, KBO 순위 확인
2. 경기방에서 선발 투수, 승리/패전/세이브 투수, 라인업, 문자중계 확인
3. 경기방에서 관련 글 요약과 공식 기록 브리핑 실행
4. 글쓰기 페이지에서 기존 태그 선택과 유사 글 확인
5. 경기 리뷰 작성 도우미로 리뷰 초안 생성
6. 뉴스 페이지에서 기사 확인 후 URL 브리핑 실행
7. 게시글 상세에서 유사 게시글 추천 확인
8. 댓글 작성 시 모더레이터 경고/차단 흐름 확인
9. 야구 게시판 도우미에게 게시글, 순위, 기록실, 경기방 관련 질문 입력

### RAG / MCP / Agent 시연 구분

| 시연 | 분류 |
| --- | --- |
| 게시글 상세의 유사 글 추천 | RAG |
| 글쓰기 페이지의 유사 글 확인 | RAG |
| 경기방 관련 글 요약 | RAG |
| 뉴스 URL 브리핑 | MCP |
| KBO 경기 일정/결과 조회 | MCP |
| KBO 공식 기록 브리핑 | MCP |
| 경기 리뷰 초안 생성 | Agent |
| 게시글/댓글 모더레이션 | Agent |
| 야구 게시판 도우미 | Agent |
| 경기 승부 예측 | Agent |

## 13. 현재 검증 결과

현재 로컬 환경에서 다음 항목을 확인했습니다.

- `npm.cmd run lint` 통과
- `npm.cmd run build` 통과
- PostgreSQL / Prisma migration 적용
- pgvector 기반 `PostEmbedding` 저장 확인
- 회원가입 / 로그인 확인
- 게시글 CRUD 확인
- 댓글 CRUD 확인
- 태그 필터와 다중 태그 선택 확인
- 검색과 페이지네이션 확인
- 추천/비추천 확인
- KBO 뉴스 조회 확인
- KBO 순위 조회 확인
- 선수 기록실 조회 확인
- KBO 경기 정보 조회 확인
- 라인업 조회 확인
- 문자중계 이닝별 조회 로직 확인
- RAG 유사 글 추천 확인
- RAG 관련 글 요약 확인
- MCP JSON-RPC tool 호출 구조 확인
- Agent 리뷰 초안 생성 확인
- Agent 모더레이션 allow/warn/block 확인
- 홈 화면 라우트 `200` 응답 확인

## 14. 회고, 한계점, 개선 아이디어

### 회고

처음에는 게시판에 AI 기능을 붙이는 데 초점을 두었지만, 구현을 진행하면서 AI 기능이 화면에서 너무 튀면 실제 커뮤니티처럼 느껴지지 않는다는 점을 알게 됐습니다. 그래서 최종적으로는 게시판, 경기방, 뉴스, 기록실 같은 야구 커뮤니티 흐름을 먼저 만들고, 필요한 순간에 RAG, MCP, Agent가 보조하는 구조로 바꾸었습니다.

이번 프로젝트를 통해 프론트엔드 화면, 백엔드 API, DB 모델, 인증, 외부 데이터 연동, LLM 호출, 벡터 검색, Agent 흐름이 실제 서비스 안에서 어떻게 연결되는지 경험할 수 있었습니다.

### 한계점

- OpenAI API 사용량에 따라 비용이 발생합니다.
- RAG 품질은 게시글 수와 게시글 내용 품질에 영향을 받습니다.
- KBO 공식 API가 공개 문서 형태로 제공되는 구조는 아니기 때문에, KBO 페이지 구조가 바뀌면 데이터 파싱 로직 수정이 필요할 수 있습니다.
- 네이버 스포츠 문자중계, 라인업, 기록 데이터 역시 외부 페이지 구조 변경에 영향을 받을 수 있습니다.
- 승부 예측은 실제 예측 모델이 아니라 경기 정보, 선발 투수, 순위, 라인업을 바탕으로 한 LLM 브리핑이므로 참고용입니다.
- Agent는 직접 구현한 간단한 추론 루프라 LangGraph 같은 전문 프레임워크 대비 상태 관리와 관측성이 제한적입니다.

### 개선 아이디어

- 사용자별 관심 팀 기반 개인화 추천
- 경기 리뷰 템플릿 자동 생성 고도화
- 댓글 반응과 추천/비추천 기반 인기글 랭킹 개선
- 관리자용 모더레이션 대시보드
- Agent 실행 로그 저장
- LangGraph 기반 Agent 상태 관리 고도화
- RAG 검색 결과 평가 지표 추가
- 모바일 UI 개선
- 배포 환경에서 주기적 데이터 캐싱과 장애 대응 강화

# 🌴 정글 여행 — 국내 숨은 여행 코스 공유 게시판

직접 다녀온 **국내 여행 코스**를 경유지(장소) 순서대로 공유하고, 지도로 한눈에 보고,
댓글로 토론하며, 마음에 드는 코스를 "나중에 보기"처럼 저장하는 게시판입니다.
여기에 **RAG · MCP · AI Agent** 세 가지 AI 기술을 얹어, 코스를 추천받고·질문하고·실제 장소 정보를 함께 확인할 수 있습니다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 한 줄 소개 | 국내 여행 코스를 지도로 공유하고, AI가 추천·답변·장소 확인을 돕는 게시판 |
| 핵심 목표 | React + NestJS + PostgreSQL 위에 **RAG · MCP · AI Agent**를 한 번에 연결 |
| 도메인 | 국내 여행 (경유지 좌표 → 지도 코스 시각화) |

**기술 스택**

| 영역 | 사용 기술 |
|------|-----------|
| Frontend | React (Vite) + TypeScript, React Router |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL (Docker, 포트 5433) + **pgvector** (임베딩 벡터 검색) |
| 인증 | JWT (passport-jwt), bcrypt |
| 지도 | Kakao Maps JavaScript SDK (코스 경유지 시각화) |
| AI 모델 | OpenAI — 임베딩 `text-embedding-3-small` + 채팅 `gpt-4o` |
| AI 도구 | **MCP** (`@modelcontextprotocol/sdk`) — Kakao 장소 검색 도구 |

---

## 2. 주요 구현 기능

#### 게시판 기본 기능
- **인증**: 회원가입 / 로그인 / JWT 기반 세션 유지, 헤더에 사용자 정보 표시
- **게시판 CRUD**: 코스 작성·수정·삭제·목록·상세 (작성자 본인만 수정/삭제)
- **코스 경유지 + 지도**: 장소 검색(Kakao)으로 경유지를 추가·정렬하고, 지도에 번호 마커 + 경로선으로 표시
- **상세 코스 → 카카오맵 연동**: 코스 목록의 각 장소를 누르면 카카오맵에서 해당 장소가 열림
- **댓글**: 작성 / 삭제(본인) / 좋아요
- **태그 · 검색 · 페이징**: 제목·본문 검색(q), 태그 필터(tag), 페이지네이션
- **게시글 저장(북마크)**: "나중에 보기"처럼 저장, 게시글별 저장 수(saveCount) 표시
- **마이페이지**: 내가 작성한 코스 / 저장한 코스 탭

#### 🤖 AI 기능
- **유사 코스 추천 (RAG)**: 게시글 상세 하단에 임베딩 기반으로 비슷한 코스 추천
- **게시판 Q&A API (RAG)**: 질문하면 기존 코스 후기를 근거로 답변 + 출처 표시 (`POST /rag/ask`)
- **AI 여행 질문 도우미 (Agent)**: `/ask` 화면에서 질문 의도에 따라 RAG 검색과 MCP 장소 검색 도구를 골라 답변

---

## 3. 전체 아키텍처 구조

```mermaid
flowchart LR
  User["사용자"]

  subgraph Frontend["Frontend - React / Vite :5173"]
    Web["게시판 · 마이페이지 · AI 질문 화면"]
    MapSDK["Kakao Maps JS SDK<br/>지도 표시 · 장소 검색"]
  end

  subgraph Backend["Backend - NestJS API :3000"]
    Auth["AuthModule<br/>JWT 인증"]
    Post["Post / Comment / Saved<br/>게시판 핵심 API"]
    Rag["RagModule<br/>유사 코스 검색 · Q&A"]
    Agent["AgentModule<br/>Function Calling 루프"]
    McpClient["McpModule<br/>MCP 클라이언트"]
    Prisma["PrismaService"]
  end

  subgraph Database["PostgreSQL + pgvector :5433"]
    Tables["User · Post · Place · Comment · Tag"]
    Vector["PostEmbedding<br/>vector(1536)"]
  end

  subgraph External["외부 서비스"]
    OpenAI["OpenAI API<br/>gpt-4o · text-embedding-3-small"]
    MCP["MCP Server<br/>place_search 도구"]
    KakaoLocal["Kakao Local API"]
  end

  User --> Web
  Web <-->|HTTP / JSON| Auth
  Web <-->|HTTP / JSON| Post
  Web <-->|HTTP / JSON| Rag
  Web <-->|HTTP / JSON| Agent
  Web --> MapSDK

  Auth --> Prisma
  Post --> Prisma
  Rag --> Prisma
  Agent --> Rag
  Agent --> McpClient

  Prisma --> Tables
  Prisma --> Vector

  Rag <-->|Embedding / Chat| OpenAI
  Agent <-->|Chat + Tool Calling| OpenAI
  McpClient <-->|stdio / JSON-RPC| MCP
  MCP -->|HTTPS| KakaoLocal
```

- **React**는 NestJS API만 호출합니다. (Kakao 지도 SDK는 브라우저에서 직접 로드)
- **NestJS**가 허브입니다. DB(Prisma/pgvector), MCP 서버(stdio), OpenAI(HTTPS)를 모두 조율합니다.
- **MCP 서버**는 NestJS가 띄우는 별도 프로세스로, Kakao 장소 검색을 표준 MCP 도구로 노출합니다.
- **pgvector**는 같은 PostgreSQL 인스턴스 안의 확장으로, 임베딩 벡터를 저장·검색합니다.

---

## 4. AI 활용 기능 — 기능 · 기술 · 아키텍처

### 🔌 MCP (Model Context Protocol)

**무엇을 하나** — Kakao 장소 검색을 "표준 도구(tool)"로 노출해, AI Agent가 실제 장소의 좌표를 가져올 수 있게 합니다.

**기술**
- `apps/mcp-server`: 공식 `@modelcontextprotocol/sdk`로 만든 **독립 프로세스** (stdio 통신)
- 도구 `place_search`: Kakao Local API 키워드 검색 → 이름·주소·**좌표(lat/lng)** 반환
- NestJS `McpModule`이 이 서버를 **자식 프로세스로 띄우고 MCP 클라이언트로 연결**

**아키텍처**
```
NestJS (McpService, MCP 클라이언트)
   │  stdio
   ▼
MCP 서버 (place_search 도구)
   │  HTTPS
   ▼
Kakao Local API  →  장소 이름 · 주소 · 좌표
```
- 엔드포인트: `GET /mcp/places?q=해운대`
- 왜 별도 프로세스인가: MCP의 핵심은 "도구를 표준 프로토콜로 분리"하는 것. API 키와 외부 호출을 서버 코드에서 떼어내, 다른 AI 클라이언트도 같은 도구를 재사용할 수 있습니다.

### 🧠 RAG (검색 증강 생성, Retrieval-Augmented Generation)

**무엇을 하나** — 게시판에 쌓인 코스 후기를 근거로 **유사 코스를 추천**하고 **질문에 답변**합니다. (LLM이 우리 DB 데이터를 근거로 답하게 만듦)

**기술**
- 게시글 작성/수정 시 본문을 임베딩(1536차원)해 `PostEmbedding`(pgvector)에 저장
- pgvector의 코사인 거리(`<=>`)로 의미가 가까운 코스를 검색 (raw SQL)
- 별도 RAG 프레임워크(LangChain 등) 없이 **openai SDK + pgvector**로 직접 구현

**아키텍처 — 두 단계로 분리**

*① 저장 (게시글 작성 시, 미리)*
```
게시글 본문 → OpenAI 임베딩 API → 벡터(1536) → PostEmbedding(pgvector) 저장
```
*② 검색·생성 (질문/조회 시)*
```
질문 → OpenAI 임베딩 API → 질문 벡터
     → pgvector 코사인 검색(Retrieval, OpenAI 안 거침) → 가까운 코스 N개
     → 그 코스를 컨텍스트로 OpenAI 채팅(Generation) → 답변 + 출처[1][2]
```
- **유사 코스 추천** `GET /posts/:id/similar` — 기준 글의 저장된 벡터로 바로 비교 (OpenAI 호출 0번)
- **시맨틱 검색** `GET /rag/search` — 자유 텍스트 → 가까운 코스
- **Q&A** `POST /rag/ask` — 위 ② 전체 흐름, 답변에 출처 코스 표시
- 기존 게시글 임베딩 백필: `npm run rag:backfill`

### 🤖 AI Agent (function calling 루프)

**무엇을 하나** — 사용자의 여행 질문을 받아, **도구를 스스로 골라 반복 호출**하며 기존 게시판 후기와 실제 장소 정보를 함께 근거로 답합니다. (MCP와 RAG를 도구로 함께 쓰는 상위 기능)

**기술**
- OpenAI function calling 루프 (`apps/api/src/agent`)
- 도구 2종: `search_similar_posts`(RAG, 기존 코스 검색) + `place_search`(MCP, 실제 장소 검색)
- 도구 결과 슬림화(썸네일 등 제외)로 컨텍스트 토큰 폭증 방지, 최대 호출 횟수 제한 + fallback

**아키텍처 — 모델이 판단하며 루프를 돈다**
```
사용자: "부산에서 바다랑 맛집 같이 즐길 코스 추천해줘"
   │
   ▼  POST /agent/ask
┌─────────────────────────────────────────────┐
│  AgentService (function calling 루프)         │
│   ┌──────────────────────────────────────┐   │
│   │ ① search_similar_posts → 기존 부산 코스 │  RAG
│   │ ② place_search → 실제 장소 주소·좌표    │  MCP
│   │ ③ 최종 답변 생성 → 답변 + 출처 + 장소   │
│   └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
   │
   ▼  답변 + 참고한 게시글 + 카카오맵 장소 링크 표시
```
- RAG/Q&A가 "정해진 1단계 흐름"인 반면, Agent는 **모델이 어떤 도구를 언제 쓸지 스스로 결정**하는 게 차이입니다.

---

## 5. 데모

> 아래 스크린샷은 `docs/screenshots/`에 있습니다.

### AI 여행 질문 도우미 (Agent)
질문하면 Agent가 게시판 후기와 실제 장소 정보를 찾아 답변합니다.

![AI 여행 질문 도우미](docs/screenshots/ai-agent-ask.jpg)

### 데모 시나리오
1. 회원가입 → 로그인 (헤더에 이름/아바타 표시)
2. 코스 작성 화면에서 장소 검색으로 경유지 추가·정렬, 태그 입력 후 게시
3. 상세 화면에서 지도(번호 마커 + 경로선)로 코스 확인, 장소 클릭 시 카카오맵 열기
4. **🤖 AI 유사 코스 추천**: 상세 하단에서 비슷한 코스 확인
5. 댓글 작성 / 좋아요
6. 검색 + 페이징으로 코스 탐색
7. 마음에 드는 코스 **저장** → 마이페이지에서 작성/저장한 코스 확인
8. **🤖 AI 여행 질문 도우미** (`/ask`): "혼자 힐링하기 좋은 코스 있어?" → Agent가 RAG와 MCP 도구를 골라 답변 + 출처 코스/장소 확인

---

## 6. 회고 · 한계점 · 개선 아이디어

### 회고
- **세 AI 기술의 역할 분담이 명확해졌다.** MCP는 "도구(외부 능력)", RAG는 "내 데이터 기반 검색·생성", Agent는 "도구를 조합해 스스로 판단"으로 정리되며, Agent가 MCP·RAG를 도구로 끌어다 쓰는 구조가 자연스럽게 맞아떨어졌다.
- **RAG를 프레임워크 없이 직접 구현**(openai SDK + pgvector)하며 임베딩 → 코사인 검색 → 컨텍스트 주입의 동작 원리를 투명하게 다룰 수 있었다.
- **pgvector를 기존 PostgreSQL에 얹어** 별도 벡터 DB 없이 RAG를 붙인 점이 인프라를 단순하게 유지했다.

### 한계점
- **외부 API 의존**: 임베딩·생성 모두 OpenAI API 호출이라, 네트워크 지연(특히 한국↔미국 RTT)과 호출 비용·레이트리밋의 영향을 받는다. Agent는 루프마다 왕복이 누적돼 응답에 수 초가 걸린다.
- **질문 임베딩 매번 생성**: 같은 질문도 매번 임베딩 API를 호출한다. (캐싱 미적용)
- **임베딩 본문 길이 제한**: 본문을 8000자에서 잘라 임베딩하므로, 매우 긴 글은 일부 정보가 누락될 수 있다.
- **Agent 도구 범위가 좁다**: 현재 Agent가 사용할 수 있는 도구는 게시판 유사 코스 검색과 Kakao 장소 검색으로 제한되어 있다.
- **답변 스트리밍 미적용**: Q&A 답변이 한 번에 나와, 체감 응답 속도가 느리다.
- **이미지 저장 방식**: 썸네일을 base64로 DB에 저장해, 큰 이미지가 응답 크기를 키운다. (실제로 Agent 컨텍스트 토큰 폭증 이슈가 있어 도구 결과에서 썸네일을 제외했다.)

### 개선 아이디어
- **같은 리전 배포**로 OpenAI RTT를 줄이고, **답변 스트리밍**으로 체감 속도 개선
- **질문 임베딩 캐싱**(Redis) + 자주 묻는 질문 프리컴퓨트
- 트래픽이 커지면 **로컬 임베딩 모델**(sentence-transformers) 도입 검토 — 이때 Python AI 서비스 분리
- **긴 본문 청킹(chunking)** 후 다중 벡터 저장으로 검색 정확도 향상
- **Agent 도구 확장**: 코스 초안 생성, 태그 자동 추천, 일정/동선 최적화, 예산 추정 등
- 이미지를 **오브젝트 스토리지(S3 등)** 로 분리해 DB·응답 경량화

---

## 부록 A. 실행 방법

### 1) 환경 변수 (`.env`, 루트)
```bash
DATABASE_URL="postgresql://cine:cine_password@localhost:5433/cine_review_ai?schema=public"
PORT=3000
FRONTEND_URL="http://localhost:5173"
VITE_API_BASE_URL="http://localhost:3000"
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"
VITE_KAKAO_MAP_KEY="..."     # Kakao Developers > JavaScript 키 (지도 표시)
KAKAO_REST_API_KEY="..."     # Kakao Developers > REST API 키 (MCP 서버 장소 검색)
OPENAI_API_KEY="sk-..."      # OpenAI API 키 (RAG/Agent). sk- 로 시작
```
> - Kakao 지도가 안 뜨면: Kakao Developers 앱에서 **카카오맵 서비스 활성화** + **JavaScript SDK 도메인에 `http://localhost:5173` 등록** 확인.
> - `OPENAI_API_KEY`는 **`sk-`로 시작하는 API 키**입니다. (조직 ID `org-...`가 아님)

### 2) 실행
```bash
# DB 컨테이너 (포트 5433)
docker compose up -d

# MCP 서버 빌드 (NestJS가 dist/index.js를 자식 프로세스로 띄움 → 먼저 빌드 필요)
cd apps/mcp-server && npm install && npm run build

# 백엔드 (포트 3000)
cd ../api && npm install
npx prisma migrate deploy   # 마이그레이션 적용 (pgvector extension 포함)
npm run prisma:generate     # Prisma Client 생성
npm run prisma:seed         # 샘플 코스(부산·강릉·제주) 시드
npm run rag:backfill        # 기존 코스에 임베딩 생성 (RAG 추천/Q&A용)
npm run start:dev

# 프론트엔드 (포트 5173)
cd ../web && npm install && npm run dev
```
- DB 연결 오류(ECONNREFUSED) 시: `docker ps | grep cine-review-db`로 컨테이너 상태 먼저 확인.
- AI 기능(추천/Q&A/Agent)은 `OPENAI_API_KEY`가 있어야 동작합니다. 키가 없으면 나머지 기능은 정상 동작하고 AI 영역만 비활성화됩니다.

## 부록 B. 프로젝트 구조

```
apps/
  mcp-server/               # MCP 서버 (독립 프로세스, stdio)
    src/index.ts            #   place_search 도구 (Kakao Local API)
  api/                      # NestJS 백엔드
    prisma/                 # schema, migrations, seed
    src/
      auth/                 # JWT 인증 (+ optional-jwt-auth.guard)
      post/                 # 게시글 CRUD + 저장 로직 (+ 임베딩 자동 갱신)
      comment/              # 댓글 + 좋아요
      saved/                # 게시글 저장(북마크) API
      mcp/                  # MCP 클라이언트 (장소 검색)
      rag/                  # OpenAI 래퍼 + RAG (추천/검색/Q&A) + backfill
      agent/                # AI Agent (function calling 루프, RAG+MCP 도구 선택)
  web/                      # React 프론트엔드
    src/
      Layout.tsx            # 공통 헤더/푸터
      MainPage.tsx          # 랜딩 히어로
      LoginPage / SignupPage
      PostListPage / PostDetailPage / PostFormPage
      SimilarPosts.tsx      # AI 유사 코스 추천 (RAG)
      AskPage.tsx           # AI 여행 질문 도우미 (Agent: RAG+MCP)
      MyPage.tsx            # 작성/저장한 코스
      CourseMap / PlaceEditor / kakaoLoader  # 지도·장소
      api.ts                # 백엔드 호출 모음
```

## 부록 C. 로드맵

- ✅ 1~6단계: 뼈대, DB 모델링, 인증, 게시판 CRUD, 댓글/태그/검색/페이징, Kakao 지도
- ✅ 추가: 게시글 저장(북마크)/마이페이지, 댓글 좋아요, 국내 전용 개편, 공통 레이아웃
- ✅ 7단계: MCP 서버 (Kakao 장소 검색 도구)
- ✅ 8단계: RAG (pgvector + 임베딩, 유사 코스 추천/Q&A)
- ✅ 9단계: AI Agent (function calling 루프, RAG+MCP 도구 기반 질문 답변)
- ✅ 10단계: 문서/데모 정리

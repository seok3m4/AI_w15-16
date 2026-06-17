# 숨겨진 여행 코스 공유 게시판 — 프로젝트 컨텍스트

## 한 줄 요약
사용자가 숨겨진 여행 코스를 게시글로 공유하고 댓글로 토론하며, AI(RAG + MCP + Agent)가 여행 계획을 도와주는 게시판.
핵심 목표: React + NestJS + PostgreSQL + RAG + MCP + AI Agent를 한 번에 연결.

## 기술 스택
- **Frontend**: React (Vite), `apps/web`
- **Backend**: NestJS, `apps/api`
- **DB**: PostgreSQL (Docker, 포트 5433), Prisma ORM
- **Vector DB**: pgvector (같은 PostgreSQL 인스턴스)
- **AI**: OpenAI API (embedding + chat)
- **지도**: Kakao Maps JavaScript SDK (코스 경유지 시각화)
- **인증**: JWT (passport-jwt)

## 실행 환경
```bash
# DB 컨테이너 (포트 5433)
docker compose up -d

# API 서버 (포트 3000)
cd apps/api && npm run start:dev

# 웹 서버 (포트 5173)
cd apps/web && npm run dev
```

DB가 ECONNREFUSED 에러를 낼 때는 `docker ps | grep cine-review-db` 로 컨테이너 상태 먼저 확인.

## 구현 단계 로드맵

### ✅ 1단계: 프로젝트 뼈대
- monorepo 구조, React + NestJS 연결, `/health` API, CORS, 환경변수

### ✅ 2단계: DB 모델링 (Prisma)
- User, Post, Comment, Tag, PostTag(N:M), PostEmbedding 모델
- migration + seed data

### ✅ 3단계: 인증
- 회원가입/로그인 API, bcrypt 해싱, JWT 발급, JwtAuthGuard
- React 로그인/회원가입 화면, AuthContext

### ✅ 4단계: 기본 게시판 CRUD
- 게시글 작성/목록/상세/수정/삭제 API (PostService, PostController)
- React 목록/상세/작성·수정 화면, 페이지네이션 API 기반 준비

### ✅ 5단계: 댓글, 태그, 검색, 페이징
- [x] 댓글 작성/삭제 API (`POST /posts/:id/comments`, `DELETE /posts/:id/comments/:cid`) — CommentModule
- [x] 태그 생성/연결 (게시글 생성·수정 시 `tags: string[]` upsert + PostTag 연결, syncTags)
- [x] 게시글 목록 제목/본문 검색 (query param `q`, insensitive contains)
- [x] 태그 필터 (query param `tag`)
- [x] React 검색창(PostListPage) + 페이지네이션 UI
- [x] React 댓글 작성/삭제 UI (PostDetailPage)

### ✅ 6단계: 지도 코스 시각화 (Kakao Maps) — 날씨 대신 채택
- [x] `Place` 모델 추가 (postId, name, address?, lat, lng, order) + migration
- [x] 게시글 생성·수정 시 `places: PlaceInput[]` 저장 (PostService syncPlaces, order 0부터 재정렬)
- [x] 응답에 places를 order 순으로 포함, seed에 코스 4개 경유지씩 추가
- [x] `.env`에 `VITE_KAKAO_MAP_KEY` 추가 (사용자가 Kakao Developers에서 발급, localhost:5173 등록 필요)
- [x] React: kakaoLoader(SDK 로더), CourseMap(번호 마커+경로선), PlaceEditor(장소검색·추가·정렬), PostDetailPage 지도 표시
- 비고: 날씨 기능(WeatherModule)은 컨셉에 안 맞아 제거함

### ✅ 7단계: MCP 구현
- [x] `apps/mcp-server` 별도 프로세스 (공식 `@modelcontextprotocol/sdk`, stdio)
- [x] tool: `place_search`(Kakao Local API 키워드 검색 → 이름·주소·좌표)
- [x] NestJS `McpModule`이 child process로 띄워 MCP client 연결, `GET /mcp/places?q=`
- 비고: 실행 전 `apps/mcp-server`에서 `npm run build` 필요. `.env`에 `KAKAO_REST_API_KEY`

### ✅ 8단계: RAG
- [x] pgvector extension + `PostEmbedding` 테이블 (vector(1536))
- [x] 게시글 생성/수정 시 embedding 자동 저장 (OpenAI text-embedding-3-small, try/catch)
- [x] 유사 코스 추천 `GET /posts/:id/similar`, 시맨틱 검색 `GET /rag/search`, Q&A API `POST /rag/ask`
- [x] 유사도 임계값(SIMILARITY_THRESHOLD=0.38)으로 관련 약한 코스 제외
- [x] React: SimilarPosts(상세 하단 추천). 게시판 Q&A는 9단계에서 Agent(`/agent/ask`)로 통합
- [x] backfill 스크립트 `npm run rag:backfill` (기존 게시글 임베딩 생성)

### ✅ 9단계: AI Agent (게시판 AI 질문)
- [x] OpenAI function calling 루프 (`apps/api/src/agent`, MAX_ROUNDS=5 + fallback)
- [x] tool: `search_similar_posts`(RAG 코스 검색) + `place_search`(MCP 실제 장소)
- [x] 도구 결과 슬림화(thumbnailUrl 등 제외)로 컨텍스트 토큰 폭증 방지
- [x] 응답: 답변 + 참고 코스(RAG) + 실제 장소(MCP). 답변에 언급된 장소만 카카오맵 칩으로 표시
- [x] `POST /agent/ask`, React: AskPage(`/ask`, 헤더 "AI 질문") — 로딩 중 코스 광고 + 점 애니메이션
- 비고: 초기엔 "AI 코스 생성(build_course)"이었으나, AI 질문 도우미(RAG+MCP)로 전환함

### ✅ 10단계: README, 데모
- [x] README: MCP/RAG/Agent 아키텍처, 실행 방법(키 3종), 데모 시나리오 갱신

## 최종 데모 시나리오 (완료 기준)
1. 회원가입 → 로그인
2. 게시글 작성 + 장소 검색으로 코스 경유지 추가 + 태그 붙이기
3. 상세 화면에서 지도로 코스 경로 확인 (번호 마커 + 경로선), 장소 클릭 시 카카오맵 열기
4. 댓글 작성 / 좋아요
5. 검색 + 페이징으로 게시글 탐색, 마음에 드는 코스 저장 → 마이페이지
6. 유사 여행 코스 추천 확인 (상세 하단, RAG)
7. AI 질문(`/ask`)으로 코스 추천·장소 정보 답변 받기 (Agent가 RAG+MCP 활용, 답변에 카카오맵 장소 칩)

## 의도적 제외 항목
GraphQL, gRPC, OAuth2, WebSocket, Redis, RabbitMQ, Microservices, CQRS, Sharding

## 파일 구조 요약
```
apps/
  mcp-server/        # MCP 서버 (독립 프로세스, stdio) — place_search 도구
  api/
    src/
      auth/          # JWT 인증 (controller, service, guard, strategy, dto)
      post/          # 게시글 CRUD + 저장 + 임베딩 자동 갱신
      comment/       # 댓글 + 좋아요
      saved/         # 게시글 저장(북마크)
      mcp/           # MCP 클라이언트 (장소 검색)
      rag/           # OpenAI 래퍼 + RAG(추천/검색/Q&A) + backfill
      agent/         # AI Agent (function calling 루프, AI 질문)
      prisma/        # PrismaService
  web/
    src/
      AuthContext.tsx / useAuth.ts
      LoginPage.tsx / SignupPage.tsx
      PostListPage.tsx / PostDetailPage.tsx / PostFormPage.tsx
      SimilarPosts.tsx   # 유사 코스 추천 (RAG)
      AskPage.tsx        # AI 질문 (Agent + RAG + MCP)
      MyPage.tsx         # 작성/저장한 코스
      CourseMap.tsx / PlaceEditor.tsx / kakaoLoader.ts  # 지도·장소
      MainPage.tsx
      api.ts         # 백엔드 fetch 함수 모음
```

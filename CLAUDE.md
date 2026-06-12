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

### 🔲 7단계: MCP 구현
- `apps/mcp-server` 별도 프로세스 (공식 `@modelcontextprotocol/sdk`)
- tool: `place.search`(Kakao 장소 검색/지오코딩) 등 — 날씨 대신 지도 기반 도구로 변경
- NestJS가 MCP client로 server에 접속

### 🔲 8단계: RAG
- pgvector extension 활성화
- 게시글 생성 시 embedding 저장 (OpenAI text-embedding-3-small)
- 유사 여행 코스 추천 API, Q&A API
- React 추천 UI + Q&A UI

### 🔲 9단계: AI Agent
- OpenAI function calling 루프 (while + tool_calls)
- 여행 코스 초안 생성, 태그 추천, 장소 검색/지오코딩 MCP tool 호출(좌표 자동 변환)
- 최대 tool 호출 횟수 제한, fallback 응답
- React AI 작성 도우미 UI

### 🔲 10단계: 테스트, README, 데모
- README: 아키텍처, RAG/MCP/Agent 설명, 실행 방법, 스크린샷

## 최종 데모 시나리오 (완료 기준)
1. 회원가입 → 로그인
2. 게시글 작성 + 장소 검색으로 코스 경유지 추가 + 태그 붙이기
3. 상세 화면에서 지도로 코스 경로 확인 (번호 마커 + 경로선)
4. 댓글 작성
5. 검색 + 페이징으로 게시글 탐색
6. 유사 여행 코스 추천 확인
7. 게시판 Q&A로 기존 후기 요약 받기
8. AI Agent로 여행 코스 초안 생성

## 의도적 제외 항목
GraphQL, gRPC, OAuth2, WebSocket, Redis, RabbitMQ, Microservices, CQRS, Sharding

## 파일 구조 요약
```
apps/
  api/
    src/
      auth/          # JWT 인증 (controller, service, guard, strategy, dto)
      post/          # 게시글 CRUD (controller, service, dto)
      prisma/        # PrismaService
  web/
    src/
      AuthContext.tsx / useAuth.ts
      LoginPage.tsx / SignupPage.tsx
      PostListPage.tsx / PostDetailPage.tsx / PostFormPage.tsx
      MainPage.tsx
      api.ts         # 백엔드 fetch 함수 모음
```

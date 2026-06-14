# 🌴 정글 여행 — 국내 숨은 여행 코스 공유 게시판

직접 다녀온 **국내 여행 코스**를 경유지(장소) 순서대로 공유하고, 지도로 한눈에 보고,
댓글로 토론하며, 마음에 드는 코스를 "나중에 보기"처럼 저장하는 게시판입니다.

> 팀원: 고민석, 김규민, 김민철, 김석제, 박민석, 백승진

## 기술 스택

| 영역 | 사용 기술 |
|------|-----------|
| Frontend | React (Vite) + TypeScript, React Router |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL (Docker, 포트 5433) + pgvector (임베딩 벡터 검색) |
| 인증 | JWT (passport-jwt), bcrypt |
| 지도 | Kakao Maps JavaScript SDK (코스 경유지 시각화) |
| AI | OpenAI (임베딩 `text-embedding-3-small` + 채팅 `gpt-4o-mini`) |
| AI 도구 | MCP (`@modelcontextprotocol/sdk`) — Kakao 장소 검색 도구 |

## 주요 기능 (구현 완료)

- **인증**: 회원가입 / 로그인 / JWT 기반 세션 유지, 헤더에 사용자 정보 표시
- **게시판 CRUD**: 코스 작성·수정·삭제·목록·상세 (작성자 본인만 수정/삭제)
- **코스 경유지 + 지도**: 장소 검색(Kakao)으로 경유지를 추가·정렬하고, 지도에 번호 마커 + 경로선으로 표시
- **상세 코스 → 카카오맵 연동**: 코스 목록의 각 장소를 누르면 카카오맵에서 해당 장소가 열림
- **댓글**: 작성 / 삭제(본인) / 좋아요
- **태그 · 검색 · 페이징**: 제목·본문 검색(q), 태그 필터(tag), 페이지네이션
- **게시글 저장(북마크)**: "나중에 보기"처럼 저장, 게시글별 저장 수(saveCount) 표시
- **마이페이지**: 내가 작성한 코스 / 저장한 코스 탭
- **🤖 AI 유사 코스 추천 (RAG)**: 게시글 상세 하단에 임베딩 기반으로 비슷한 코스 추천
- **🤖 AI 게시판 Q&A (RAG)**: 질문하면 기존 코스 후기를 근거로 답변 + 출처 표시 (`/ask`)
- **🤖 AI 코스 초안 생성 (Agent)**: 한 줄 요청으로 실제 장소·좌표·태그가 채워진 코스 초안 자동 작성
- **UI**: Apple 스타일 디자인 + 공통 헤더/푸터 + 랜딩 히어로

## 🤖 AI 아키텍처 (MCP · RAG · Agent)

이 프로젝트는 세 가지 AI 기술을 한 번에 연결합니다.

### MCP (Model Context Protocol)
- `apps/mcp-server`: 공식 SDK로 만든 **독립 프로세스** MCP 서버 (stdio 통신)
- 도구 `place_search`: Kakao Local API로 장소를 검색해 이름·주소·**좌표(lat/lng)** 반환
- NestJS(`McpModule`)가 이 서버를 자식 프로세스로 띄우고 MCP **클라이언트**로 연결
- 엔드포인트: `GET /mcp/places?q=해운대`

### RAG (검색 증강 생성)
- 게시글 작성/수정 시 본문을 임베딩(1536차원)해 `PostEmbedding`(pgvector)에 저장
- pgvector의 코사인 거리(`<=>`)로 의미가 가까운 코스를 검색
- **유사 코스 추천** `GET /posts/:id/similar`, **시맨틱 검색** `GET /rag/search`
- **Q&A** `POST /rag/ask`: 질문을 임베딩 → 가까운 후기를 컨텍스트로 넣어 답변 생성 + 출처 표시

### AI Agent (function calling 루프)
- `POST /agent/draft`: 사용자의 한 줄 요청을 받아 도구를 반복 호출하며 코스를 설계
- 사용 도구: `place_search`(MCP, 실제 좌표) + `search_similar_posts`(RAG, 기존 코스 참고) + `build_course`(최종 초안 제출)
- 최대 호출 횟수 제한 + fallback으로 안전하게 종료, 결과를 작성 폼에 자동 입력

## 실행 방법

### 1. 환경 변수 (`.env`, 루트)

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

### 2. 실행

```bash
# DB 컨테이너 (포트 5433)
docker compose up -d

# MCP 서버 빌드 (NestJS가 dist/index.js를 자식 프로세스로 띄움 → 먼저 빌드 필요)
cd apps/mcp-server
npm install
npm run build

# 백엔드 (포트 3000)
cd ../api
npm install
npx prisma migrate deploy   # 마이그레이션 적용 (pgvector extension 포함)
npm run prisma:generate     # Prisma Client 생성
npm run prisma:seed         # 샘플 코스(부산·강릉·제주) 시드
npm run rag:backfill        # 기존 코스에 임베딩 생성 (RAG 추천/Q&A용)
npm run start:dev

# 프론트엔드 (포트 5173)
cd ../web
npm install
npm run dev
```

- DB 연결 오류(ECONNREFUSED) 시: `docker ps | grep cine-review-db`로 컨테이너 상태 먼저 확인.
- AI 기능(추천/Q&A/Agent)은 `OPENAI_API_KEY`가 있어야 동작합니다. 키가 없으면 나머지 기능은 정상 동작하고 AI 영역만 비활성화됩니다.

## 데모 시나리오

1. 회원가입 → 로그인 (헤더에 이름/아바타 표시)
2. **🤖 AI 코스 초안 생성**: 작성 화면에서 "부산 2박 3일 바다·맛집 코스 만들어줘" 입력 → 제목·본문·태그·경유지(실제 좌표)가 자동으로 채워짐
3. 필요하면 장소 검색으로 경유지 추가·정렬, 태그 수정 후 게시
4. 상세 화면에서 지도(번호 마커 + 경로선)로 코스 확인, 장소 클릭 시 카카오맵 열기
5. **🤖 AI 유사 코스 추천**: 상세 하단에서 비슷한 코스 확인
6. 댓글 작성 / 좋아요
7. 검색 + 페이징으로 코스 탐색
8. 마음에 드는 코스 **🔖 저장** → 마이페이지에서 작성/저장한 코스 확인
9. **🤖 AI 게시판 Q&A** (`/ask`): "혼자 힐링하기 좋은 코스 있어?" → 기존 후기 근거로 답변 + 출처 코스 확인

## 프로젝트 구조

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
      agent/                # AI Agent (function calling 루프, 코스 초안)
  web/                      # React 프론트엔드
    src/
      Layout.tsx            # 공통 헤더/푸터
      MainPage.tsx          # 랜딩 히어로
      LoginPage / SignupPage
      PostListPage / PostDetailPage / PostFormPage
      SimilarPosts.tsx      # AI 유사 코스 추천 (RAG)
      AskPage.tsx           # AI 게시판 Q&A (RAG)
      MyPage.tsx            # 작성/저장한 코스
      CourseMap / PlaceEditor / kakaoLoader  # 지도·장소
      api.ts               # 백엔드 호출 모음
```

## 로드맵

- ✅ 1~6단계: 뼈대, DB 모델링, 인증, 게시판 CRUD, 댓글/태그/검색/페이징, Kakao 지도
- ✅ 추가: 게시글 저장(북마크)/마이페이지, 댓글 좋아요, 국내 전용 개편, 공통 레이아웃
- ✅ 7단계: MCP 서버 (Kakao 장소 검색 도구)
- ✅ 8단계: RAG (pgvector + 임베딩, 유사 코스 추천/Q&A)
- ✅ 9단계: AI Agent (function calling 루프, 코스 초안 생성)
- ✅ 10단계: 문서/데모 정리

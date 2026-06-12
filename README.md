# 🌴 정글 여행 — 국내 숨은 여행 코스 공유 게시판

직접 다녀온 **국내 여행 코스**를 경유지(장소) 순서대로 공유하고, 지도로 한눈에 보고,
댓글로 토론하며, 마음에 드는 코스를 "나중에 보기"처럼 저장하는 게시판입니다.

> 팀원: 고민석, 김규민, 김민철, 김석제, 박민석, 백승진

## 기술 스택

| 영역 | 사용 기술 |
|------|-----------|
| Frontend | React (Vite) + TypeScript, React Router |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL (Docker, 포트 5433), pgvector(RAG용, 예정) |
| 인증 | JWT (passport-jwt), bcrypt |
| 지도 | Kakao Maps JavaScript SDK (코스 경유지 시각화) |
| AI (예정) | OpenAI (RAG 추천/Q&A, Agent) + MCP |

## 주요 기능 (구현 완료)

- **인증**: 회원가입 / 로그인 / JWT 기반 세션 유지, 헤더에 사용자 정보 표시
- **게시판 CRUD**: 코스 작성·수정·삭제·목록·상세 (작성자 본인만 수정/삭제)
- **코스 경유지 + 지도**: 장소 검색(Kakao)으로 경유지를 추가·정렬하고, 지도에 번호 마커 + 경로선으로 표시
- **상세 코스 → 카카오맵 연동**: 코스 목록의 각 장소를 누르면 카카오맵에서 해당 장소가 열림
- **댓글**: 작성 / 삭제(본인)
- **태그 · 검색 · 페이징**: 제목·본문 검색(q), 태그 필터(tag), 페이지네이션
- **게시글 저장(북마크)**: "나중에 보기"처럼 저장, 게시글별 저장 수(saveCount) 표시
- **마이페이지**: 내가 저장한 코스 모아보기
- **UI**: Apple 스타일 디자인 + 공통 헤더/푸터 + 랜딩 히어로

## 실행 방법

### 1. 환경 변수 (`.env`, 루트)

```bash
DATABASE_URL="postgresql://cine:cine_password@localhost:5433/cine_review_ai?schema=public"
PORT=3000
FRONTEND_URL="http://localhost:5173"
VITE_API_BASE_URL="http://localhost:3000"
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"
VITE_KAKAO_MAP_KEY="..."   # Kakao Developers > JavaScript 키 (지도/장소검색에 필요)
OPENAI_API_KEY=""          # RAG/Agent 단계에서 사용 (예정)
```

> Kakao 지도가 안 뜨면: Kakao Developers 앱에서 **카카오맵 서비스 활성화** + **JavaScript SDK 도메인에 `http://localhost:5173` 등록** 확인.

### 2. 실행

```bash
# DB 컨테이너 (포트 5433)
docker compose up -d

# 백엔드 (포트 3000)
cd apps/api
npm install
npx prisma migrate deploy   # 마이그레이션 적용
npm run prisma:generate     # Prisma Client 생성
npm run prisma:seed         # 샘플 코스(부산·강릉·제주) 시드
npm run start:dev

# 프론트엔드 (포트 5173)
cd apps/web
npm install
npm run dev
```

DB 연결 오류(ECONNREFUSED) 시: `docker ps | grep cine-review-db`로 컨테이너 상태 먼저 확인.

## 데모 시나리오

1. 회원가입 → 로그인 (헤더에 이름/아바타 표시)
2. 코스 작성 + 장소 검색으로 경유지 추가 + 태그 입력
3. 상세 화면에서 지도(번호 마커 + 경로선)로 코스 확인, 장소 클릭 시 카카오맵 열기
4. 댓글 작성
5. 검색 + 페이징으로 코스 탐색
6. 마음에 드는 코스 **🔖 저장** → 마이페이지에서 저장한 코스 확인

## 프로젝트 구조

```
apps/
  api/                      # NestJS 백엔드
    prisma/                 # schema, migrations, seed
    src/
      auth/                 # JWT 인증 (+ optional-jwt-auth.guard)
      post/                 # 게시글 CRUD + 저장 로직
      comment/              # 댓글
      saved/                # 게시글 저장(북마크) API
  web/                      # React 프론트엔드
    src/
      Layout.tsx            # 공통 헤더/푸터
      MainPage.tsx          # 랜딩 히어로
      LoginPage / SignupPage
      PostListPage / PostDetailPage / PostFormPage
      MyPage.tsx            # 저장한 코스
      CourseMap / PlaceEditor / kakaoLoader  # 지도·장소
      api.ts               # 백엔드 호출 모음
```

## 로드맵

- ✅ 1~6단계: 뼈대, DB 모델링, 인증, 게시판 CRUD, 댓글/태그/검색/페이징, Kakao 지도
- ✅ 추가: 게시글 저장(북마크)/마이페이지, 국내 전용 개편, 공통 레이아웃
- 🔲 7단계: MCP 서버 (Kakao 장소 검색 도구)
- 🔲 8단계: RAG (pgvector + 임베딩, 유사 코스 추천/Q&A)
- 🔲 9단계: AI Agent (function calling 루프, 코스 초안 생성)
- 🔲 10단계: 테스트/문서/데모 정리

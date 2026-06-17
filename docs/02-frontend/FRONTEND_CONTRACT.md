# 프론트엔드 구현 계약서 — 텍스트 기반 Memory MVP

> **기준 산출물**:
> - 요구사항: `docs/00-product/REQUIREMENTS.md`
> - API 명세: `docs/01-design/API_SPEC.md`
> - 화면 흐름도: `docs/02-frontend/SCREEN_FLOW.md`
> - 디자인 시스템: `docs/02-frontend/DESIGN_SYSTEM.md`
> - 시각 프리뷰: `docs/02-frontend/preview/memento-style-preview.html`

---

## 1. 문서 목적

이 문서는 `frontend/` 구현을 시작하기 전, 화면 흐름도와 API 명세를 실제 React/Vite 구현 단위로 바꾸는 계약서다.

- 구현자는 이 문서를 기준으로 라우트, 컴포넌트, API client, 상태 처리, 디자인 토큰을 일관되게 적용한다.
- P0부터 P4까지 우선순위를 유지하되, 첫 구현은 P0 세로 슬라이스를 완성하는 순서로 진행한다.
- 디자인은 `docs/02-frontend/preview/memento-style-preview.html`의 Mono Notebook 톤과 `docs/02-frontend/DESIGN_SYSTEM.md` 토큰을 따른다.

---

## 2. 구현 우선순위

| 단계 | 목표 | 포함 화면 | 완료 기준 |
|------|------|----------|----------|
| P0 | 기본 기록 사용 가능 | S-01~S-07, S-13의 로그아웃 | 회원가입/로그인 후 게시글 CRUD, 댓글, 태그, 키워드 검색이 동작 |
| P1 | Memory 기반 검색 연결 | S-05 memory 상태, S-08 검색 | 게시글 작성 후 memory 상태를 표시하고 자연어 검색 결과를 조회 |
| P2 | AI/친구/Capsule 경험 | S-08~S-13 | AI 요약, 친구 목록/피드/좋아요, Capsule, AI 공유 동의가 동작 |
| P3 | Agent/MCP 흐름 | S-14, S-15, S-18 | 선물 추천, Agent 실행/상태, MCP 연결 상태 화면이 동작 |
| P4 | 실행 이력/승인 UI polish | S-16, S-17 | 승인 대기 처리와 Agent 실행 이력 목록/상세가 동작 |

P4 화면은 구현에서 누락하지 않되, P0~P3 기능이 동작한 뒤 polish 범위로 배치한다.

---

## 3. 라우트 계약

| Route | 화면 | 보호 | 주요 데이터 |
|-------|------|------|------------|
| `/login` | S-01 로그인 | 비인증 | `POST /api/v1/auth/login` |
| `/signup` | S-02 회원가입 | 비인증 | `POST /api/v1/auth/signup` |
| `/app` | S-03 홈 / 내 기록 피드 | 인증 | `GET /api/v1/posts?scope=me&page=0` |
| `/app/posts/new` | S-05 게시물 작성 | 인증 | `GET /api/v1/tags`, `POST /api/v1/posts` |
| `/app/posts/:postId` | S-04 게시물 상세 | 인증 | post detail, comments, likes |
| `/app/posts/:postId/edit` | S-06 게시물 수정 | 인증 | post detail, `PUT /api/v1/posts/{postId}` |
| `/app/search` | S-07 키워드 검색 | 인증 | `GET /api/v1/posts?q=...&scope=...` |
| `/app/memory-search` | S-08 Memory Search | 인증 | memory search, summarize, jobs polling |
| `/app/friends` | S-09 친구 목록 / 요청 | 인증 | friendships, friend requests |
| `/app/friends/feed` | S-10 친구 기록 피드 | 인증 | `GET /api/v1/posts?scope=friends` |
| `/app/capsules` | S-11 Capsule 목록 | 인증 | `GET /api/v1/context-capsules` |
| `/app/capsules/new` | S-12 Capsule 생성 | 인증 | `POST /api/v1/context-capsules`; P3 friend Capsule은 `scope=friend`, `friendId` 포함 |
| `/app/capsules/:capsuleId` | S-12 Capsule 상세 | 인증 | capsule detail/update/delete, compact context; friend context stale 시 `409 FRIEND_CONTEXT_CAPSULE_STALE` 표시 |
| `/app/settings` | S-13 설정 | 인증 | `GET /api/v1/auth/me`, privacy toggle |
| `/app/friends/:friendId/gift` | S-14 선물 추천 | 인증 + 친구 AI 공유 동의 | `POST /api/v1/friends/{friendId}/gift-recommendations`, jobs polling |
| `/app/agent` | S-15 Agent 실행 | 인증 | `POST /api/v1/agent-runs`, run status |
| `/app/agent/approvals/:runId` | S-16 승인 대기 | 인증 | approve/reject pending approval |
| `/app/agent/history` | S-17 Agent 실행 이력 | 인증 | `GET /api/v1/agent-runs?page=0&size=20` |
| `/app/mcp` | S-18 MCP 연결 관리 | 인증 | MCP tool/connection status |

인증 보호 라우트에서 access token이 없으면 `/login`으로 이동한다. API `401`은 `POST /api/v1/auth/refresh`를 한 번 시도하고, 실패하면 access token을 삭제한 뒤 `/login`으로 이동한다.

P3 구현 시점에는 `/app/agent`, `/app/agent/approvals/:runId`, `/app/mcp`가 실제 API에 연결된다. `/app/mcp`는 MCP Server tool catalog, scoped credential 발급/폐기, connection 상태, 최근 호출 이력을 표시한다. Notion MCP Client 연결/승인 이후 실행 결과 UI는 T4 Notion Client 구현과 함께 확장한다.

---

## 4. 프론트엔드 스택 계약

| 영역 | 선택 |
|------|------|
| 언어 / 빌드 | React + Vite + TypeScript |
| Package manager | `npm` |
| Routing | `react-router-dom` |
| Server state | `@tanstack/react-query` |
| Form | `react-hook-form` |
| Validation | `zod` |
| Styling | Tailwind CSS + `src/styles/globals.css` |
| Icons | Iconify Solar (`solar:*`) |
| Unit/component test | Vitest + React Testing Library |
| API mock | MSW |
| E2E/smoke | Playwright |
| Date formatting | `Intl.DateTimeFormat` 우선, P0에서는 별도 date library 미도입 |

라우트 정의는 React Router object route 또는 JSX route 중 하나로 통일한다. P0 scaffold에서는 object route를 기본값으로 둔다.

---

## 5. 컴포넌트와 상태 계약

### 5.1 폴더 구조

```text
frontend/src/
  app/            # router, app shell, route guards
  components/
    ui/           # Button, Input, Modal, Toast, EmptyState, Skeleton
    layout/       # Shell, SNB, PageHeader
    memory/       # PostCard, PostForm, CommentList, AIBlock, CitationLink
    friends/      # FriendCard, FriendRequestCard, FriendFeed
    capsule/      # CapsuleCard, CapsuleDetail, CompactContextBlock
    agent/        # AgentRunForm, AgentStepList, ApprovalCard, AgentRunList
    mcp/          # McpToolList, McpConnectionCard
  lib/
    api/          # fetch client, endpoint functions, auth refresh handling
    auth/         # access token storage, auth state
    mock/         # MSW handlers, fixtures
  styles/
    globals.css   # DESIGN.md CSS variables, grain, motion
  test/
    setup.ts      # Vitest/RTL/MSW setup
```

### 5.2 공통 UI 상태

| 상태 | 적용 방식 |
|------|-----------|
| loading | 목록/상세는 skeleton, AI/비동기는 `breathe` 아이콘 |
| empty | `EmptyState` + 화면별 primary action |
| error | Problem Details의 `detail` 우선 표시, field error는 인풋 하단 |
| unauthorized | refresh 실패 시 `/login` |
| forbidden | toast: "수행 권한이 없습니다" |
| not found | 존재 숨김 정책에 맞춰 404 페이지 에러 |
| async job | `202` 수신 시 `GET /api/v1/jobs/{jobId}`를 1~3초 간격 polling |

API 응답의 목록 형식은 항상 `{ items, page }`로 취급한다. public id는 UUID string, 시간은 ISO-8601 UTC string으로 렌더한다.

---

## 6. 인증 상태 계약

| 항목 | 결정 |
|------|------|
| access token 저장 | `sessionStorage` key: `memento.accessToken` |
| refresh token 저장 | 프론트 저장 금지. HttpOnly cookie 전제 |
| 로그인 성공 | `accessToken`을 `sessionStorage`에 저장하고 React Query user cache 갱신 |
| 앱 부팅 | `sessionStorage`에서 access token을 읽어 auth state 초기화 |
| 로그아웃 | `POST /api/v1/auth/logout` 후 `sessionStorage` token 삭제, query cache 초기화, `/login` 이동 |
| `401` 처리 | refresh 1회 시도 후 원 요청 재시도. refresh 실패 시 token 삭제 후 `/login` |

`sessionStorage` 사용은 브라우저 탭 단위 로그인을 기본으로 한다. 새 탭에서 로그인이 공유되지 않는 것은 MVP에서 허용한다.

---

## 7. API Client 계약

Base URL은 환경 변수로 둔다.

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Endpoint 함수는 `/api/v1`을 중복으로 붙이지 않는다. 예: `api.get('/posts?scope=me&page=0')`.

| 모듈 | 필수 함수 |
|------|-----------|
| auth | `signup`, `login`, `refresh`, `logout`, `me`, `updateAiSharing` |
| posts | `listPosts`, `getPost`, `createPost`, `updatePost`, `deletePost`, `getMemoryStatus` |
| comments | `listComments`, `createComment`, `updateComment`, `deleteComment` |
| tags | `listTags` |
| likes | `likePost`, `unlikePost` |
| friendships | `listFriendships`, `requestFriend`, `acceptFriendship`, `rejectFriendship`, `deleteFriendship` |
| memory | `searchMemories`, `summarizeMemorySearch`, `reindexMemories`, `getJob` |
| capsules | `listCapsules`, `getCapsule`, `createCapsule`, `updateCapsule`, `deleteCapsule`, `getCompactContext` |
| agent | `startAgentRun`, `listAgentRuns`, `getAgentRun`, `listAgentSteps`, `approveAgentRun`, `rejectAgentRun` |
| mcp | `listMcpTools`, `listMcpConnections`, `createMcpServerCredential`, `revokeMcpConnection`, `listMcpCallLogs` |

access token은 `sessionStorage`에서 읽어 `Authorization: Bearer <accessToken>` 헤더에만 넣는다. refresh token은 HttpOnly cookie이므로 프론트엔드 상태에 저장하지 않는다.

Problem Details 에러는 공통 `ApiError`로 normalize한다.

```ts
type ApiError = {
  status: number;
  code?: string;
  title: string;
  detail: string;
  fieldErrors?: Array<{ field: string; message: string }>;
};
```

MSW fixture는 API 모듈과 같은 도메인 단위로 둔다.

```text
frontend/src/mock/
  fixtures/
    auth.ts
    posts.ts
    comments.ts
    tags.ts
  handlers/
    auth.handlers.ts
    posts.handlers.ts
    comments.handlers.ts
    tags.handlers.ts
```

---

## 8. 디자인 적용 계약

- 서체는 Pretendard 단일. serif, secondary sans-serif 혼용 금지.
- 색상은 `docs/02-frontend/DESIGN_SYSTEM.md`의 CSS 변수와 `memento-style-preview.html`의 Tailwind 토큰을 기준으로 한다.
- AI 구분은 색이 아니라 `solar:magic-stars-*`, `border-ink/15`, `bg-soft`, citation 링크로 표현한다.
- SNB는 desktop에서 212px ↔ 64px collapse를 지원하고, `< 640px`에서는 상단 헤더 + 햄버거 패턴을 별도 구현한다.
- 모션은 `MOTION_INTENSITY 8`: reveal, lift, press, breathe, floaty만 사용하고 `prefers-reduced-motion`을 반드시 지원한다.
- 프리뷰 HTML의 CDN 의존성은 시각 검증용이다. 실제 앱은 Vite 번들에서 Pretendard CSS, Iconify 또는 동일 Solar icon set, Tailwind config를 관리한다.

### 8.1 모바일 SNB

`< 640px`에서는 SNB를 화면 밖 drawer로 렌더한다.

- 상단 헤더: 좌측 메뉴 버튼, 중앙 `Memento`, 우측 작성 버튼 또는 사용자 메뉴.
- 메뉴 버튼 클릭: 좌측 drawer open, backdrop 표시, body scroll lock.
- drawer 내 항목: P0 연결 항목은 이동, P1~P4 항목은 `준비중` 배지와 disabled 스타일.
- ESC, backdrop click, route change 시 drawer close.
- focus는 drawer 안에 가두고, 닫히면 메뉴 버튼으로 반환한다.

---

## 9. 검증 시나리오

| 단계 | 시나리오 |
|------|----------|
| P0 | 회원가입 → 로그인 → 게시글 작성 → 상세 조회 → 댓글 작성 → 키워드 검색 → 수정/삭제 |
| P0 | access token 만료 시 refresh 성공, refresh 실패 시 `/login` 이동 |
| P1 | 게시글 작성 후 `memoryStatus` 표시, Memory Search 결과 없음/있음 상태 표시 |
| P2 | AI 요약 200 응답과 202 polling 응답 모두 처리, citation 링크로 원본 상세 이동 |
| P2 | 친구 요청/수락 후 친구 피드 조회, AI 공유 미동의 친구의 선물 추천 버튼 disabled |
| P2 | Capsule 생성/상세/수정/삭제와 compact JSON 복사 toast |
| P3 | 친구 카드에서 AI 공유 동의 친구만 선물 추천 진입, 추천 결과와 출처 표시 |
| P3 | Agent 실행 후 `pending/running/approval_required/succeeded/failed` 상태 표시 |
| P4 | 승인/거절 버튼은 `approval_required`에서만 활성화, 실행 이력 목록에서 상세와 step 타임라인 진입 |
| 반응형 | desktop SNB collapse, mobile header/hamburger, 긴 한글 텍스트 overflow 없음 |
| 접근성 | keyboard focus ring, modal focus trap, color contrast, reduced motion |

### 9.1 P0 smoke command

```bash
cd frontend
npm run lint
npm run test
npm run build
npm run e2e -- --project=chromium
```

P0 구현 직후에는 MSW 기반 Playwright smoke로 회원가입 → 로그인 → 게시글 작성 → 상세 → 댓글 → 검색 → 수정/삭제 → 로그아웃을 확인한다. 실제 backend 연결 smoke는 Track A Docker Compose가 준비된 뒤 별도 실행한다.

---

## 10. 구현 전 확인 항목

- MCP 연결 관리 화면은 MCP wire protocol 문서가 확정되기 전까지 read-only status 중심으로 구현한다.
- Agent 실행 이력은 `GET /api/v1/agent-runs?page=0&size=20` API가 backend에 구현된 뒤 연결한다.
- P0에서는 SNB의 P1~P4 항목을 준비중으로 표시하고 API를 연결하지 않는다.
- P0 구현 후 실제 backend 없이 MSW smoke를 먼저 통과시키고, Track A가 준비되면 통합 smoke로 확장한다.

# Spring Security Filter Chain Separation

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`
- `backend/src/test/java/com/junglecamp/backend/LoginSecurityTests.java`

## What Was Applied

- `/api/**` 요청과 웹 페이지 요청을 서로 다른 `SecurityFilterChain`으로 분리했다.
- API 체인은 인증 실패 시 HTML 로그인 페이지로 리다이렉트하지 않고 `401 Unauthorized`를 반환한다.
- 웹 페이지 체인은 기존 Spring Security 폼 로그인 흐름을 유지한다.
- 폼 로그인 성공 후에는 백엔드 서버 페이지가 아니라 프론트 게시판 화면으로 이동한다.
- 성공 리다이렉트 목적지는 `app.frontend.board-url`이며, 환경 변수 `FRONTEND_BOARD_URL`로 바꿀 수 있다.

## Why It Matters

- 프론트엔드가 JSON API를 호출할 때 로그인 HTML이 응답으로 오면 API 클라이언트가 상태를 해석하기 어렵다.
- 브라우저 페이지 접근은 로그인 페이지 리다이렉트가 자연스럽지만, API 접근은 HTTP 상태 코드가 더 명확하다.
- 두 흐름을 같은 체인에서 무리하게 분기하면 페이지 로그인 테스트와 API 테스트가 서로 영향을 줄 수 있다.
- 프론트엔드와 백엔드가 다른 origin에서 실행될 수 있으므로 로그인 성공 URL을 설정값으로 분리해야 로컬, ECS, 정적 호스팅 환경을 같은 코드로 다룰 수 있다.

## Frontend Call Path

- 사용자가 프론트 게시판에서 로그인 버튼을 누르거나 비로그인 상태로 글/댓글 작성을 시도한다.
- `front/src/pages/HomePage.tsx`는 현재 창을 `getBackendLoginUrl()`로 이동시킨다.
- `front/src/api/backend.ts`의 기본 로그인 URL은 `http://localhost:8080/login`이며, `VITE_BACKEND_ORIGIN`으로 바꿀 수 있다.
- Spring Security 폼 로그인이 성공하면 `FRONTEND_BOARD_URL` 값으로 리다이렉트한다.
- 로컬 기본값은 `http://localhost:5173/home`이다.

## Verification

- `mvn -Dtest=LoginSecurityTests#redirectsSuccessfulLoginToFrontendBoardPage test`: 로그인 성공 후 `http://localhost:5173/home`으로 리다이렉트한다.
- 로컬 서버에서 `POST http://localhost:8080/login`: HTTP 302, `Location: http://localhost:5173/home`.
- `ApiIntegrationTests`: `/api/me` 익명 요청은 `401`을 반환한다.
- `LoginSecurityTests`: `/` 익명 요청은 `/login`으로 리다이렉트한다.

## Pitfalls And Follow-Ups

- 체인 순서가 중요하다. `/api/**` 체인이 먼저 매칭되도록 `@Order(1)`을 사용한다.
- Swagger/OpenAPI 경로처럼 공개해야 하는 웹 리소스는 웹 체인 permit list에 추가해야 한다.
- 로컬에서는 프론트 URL을 `localhost`로 맞추는 편이 세션 쿠키 확인에 유리하다. 로그인 origin과 프론트 origin의 host가 `localhost`와 `127.0.0.1`처럼 다르면 브라우저 쿠키 매칭이 달라질 수 있다.
- 이후 JWT 또는 OAuth 로그인을 도입하면 API 체인의 인증 방식을 별도로 확장하는 편이 안전하다.

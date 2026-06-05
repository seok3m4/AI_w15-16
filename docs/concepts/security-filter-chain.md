# Spring Security Filter Chain Separation

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`
- `backend/src/test/java/com/junglecamp/backend/LoginSecurityTests.java`

## What Was Applied

- `/api/**` 요청과 웹 페이지 요청을 서로 다른 `SecurityFilterChain`으로 분리했다.
- API 체인은 인증 실패 시 HTML 로그인 페이지로 리다이렉트하지 않고 `401 Unauthorized`를 반환한다.
- 웹 페이지 체인은 기존 Spring Security 폼 로그인 흐름을 유지한다.

## Why It Matters

- 프론트엔드가 JSON API를 호출할 때 로그인 HTML이 응답으로 오면 API 클라이언트가 상태를 해석하기 어렵다.
- 브라우저 페이지 접근은 로그인 페이지 리다이렉트가 자연스럽지만, API 접근은 HTTP 상태 코드가 더 명확하다.
- 두 흐름을 같은 체인에서 무리하게 분기하면 페이지 로그인 테스트와 API 테스트가 서로 영향을 줄 수 있다.

## Verification

- `.\mvnw.cmd test`: 통과
- `ApiIntegrationTests`: `/api/me` 익명 요청은 `401`을 반환한다.
- `LoginSecurityTests`: `/` 익명 요청은 `/login`으로 리다이렉트한다.

## Pitfalls And Follow-Ups

- 체인 순서가 중요하다. `/api/**` 체인이 먼저 매칭되도록 `@Order(1)`을 사용한다.
- Swagger/OpenAPI 경로처럼 공개해야 하는 웹 리소스는 웹 체인 permit list에 추가해야 한다.
- 이후 JWT 또는 OAuth 로그인을 도입하면 API 체인의 인증 방식을 별도로 확장하는 편이 안전하다.

# JWT Local Auth And Protected Workspaces

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/auth/`
- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/main/java/com/junglecamp/backend/controller/AuthController.java`
- `backend/src/main/resources/db/migration/V13__add_jwt_auth_and_source_comparison_policy.sql`
- `front/src/api/backend.ts`
- `front/src/pages/AuthPage.tsx`
- `front/src/pages/HomePage.tsx`
- `front/src/pages/MyPage.tsx`

## What Was Applied

- Google OAuth2 session login remains available.
- Local auth was added with `POST /api/auth/signup`, `POST /api/auth/login`, and `POST /api/auth/refresh`.
- Access and refresh tokens are issued as HttpOnly cookies. Refresh tokens are hashed in `auth_refresh_tokens` and rotated on refresh.
- `JwtCookieAuthenticationFilter` accepts a valid `ACCESS_TOKEN` cookie as a Spring Security authentication source.
- `JwtCsrfFilter` requires `X-XSRF-TOKEN` for mutating API requests when an `ACCESS_TOKEN` cookie is present.
- `/api/us-economy/dashboard` and `/api/us-economy/metrics/{metricId}/history` stay public.
- Events, reports, posts, tags, Agent APIs, preferences, notifications, and `/api/me` now require authentication.
- The frontend keeps only the Home workspace available to anonymous users and routes login/signup to `/auth`.

## Why It Matters

- The public economic home page can be shared without an account.
- Community, personalization, and Agent features now have a real user boundary.
- OAuth and local JWT auth produce the same `CurrentUser` shape, so frontend state does not need separate auth branches.
- Refresh-token rotation limits the blast radius of a leaked refresh token row.

## Verification

- `mvn.cmd test`: passed with 58 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed with the existing Vite large chunk warning.

## Pitfalls And Follow-Ups

- `JWT_SECRET` must be strong in production. The default is only for local bootability.
- Set `JWT_COOKIE_SECURE=true` behind HTTPS in production.
- Logout is allowed to clear cookies without an XSRF header so users can recover from stale client state.
- The legacy in-memory `user/password` remains for test and local fallback flows.

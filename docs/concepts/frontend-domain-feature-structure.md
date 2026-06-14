# Frontend Domain Feature Structure

## Where It Appears

- `front/src/features/economy/pages/HomePage.tsx`
- `front/src/features/economy/api/economy.ts`
- `front/src/features/board/pages/DiscussionBoard.tsx`
- `front/src/features/board/api/posts.ts`
- `front/src/features/agents/pages/AgentWorkbench.tsx`
- `front/src/features/agents/api/agents.ts`
- `front/src/features/admin/pages/AdminPage.tsx`
- `front/src/features/admin/api/admin.ts`
- `front/src/features/profile/pages/MyPage.tsx`
- `front/src/features/auth/pages/AuthPage.tsx`
- `front/src/features/auth/api/authApi.ts`
- `front/src/app/App.tsx`

## What Was Applied

- Non-auth frontend pages and domain APIs are grouped under `front/src/features/<domain>/`.
- Each migrated domain keeps route-level screens in `pages/` and server communication modules in `api/`.
- Auth uses the same feature structure through `features/auth/pages` and `features/auth/api`.
- `front/src/api/backend.ts` remains as the common backend module for session user types, XSRF/header helpers, shared API error handling, logout, profile, and dashboard preferences.

## Why It Matters

- The previous flat `pages/` and `api/` layout made unrelated domains share one folder as the UI grew.
- Domain grouping reduces cross-domain scanning and makes future splits into `components/`, `hooks/`, and `types.ts` local to each feature.
- Keeping shared request helpers in `front/src/api/backend.ts` avoids duplicating XSRF and error parsing across feature APIs.

## Verification

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed with the existing Vite large chunk warning.

## Pitfalls And Follow-Ups

- `profile` currently imports shared dashboard styling from `economy/pages/HomePage.css`; move shared shell styles into `shared/styles/` if that coupling grows.
- If auth UI grows further, split `AuthPage.tsx` into `components/` and `hooks/` inside `features/auth`.

# Domain Layered Package Structure

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/admin/`
- `backend/src/main/java/com/junglecamp/backend/agent/`
- `backend/src/main/java/com/junglecamp/backend/auth/`
- `backend/src/main/java/com/junglecamp/backend/board/`
- `backend/src/main/java/com/junglecamp/backend/economy/`
- `backend/src/main/java/com/junglecamp/backend/rag/`
- `backend/src/main/java/com/junglecamp/backend/system/`
- `backend/src/main/java/com/junglecamp/backend/user/`
- `backend/src/main/java/com/junglecamp/backend/web/`

## What Was Applied

- Backend code is organized by domain first, then by layer.
- Domain packages use layer subpackages such as `controller`, `service`, `repository`, `dto`, `model`, `client`, `filter`, `support`, `mapper`, `definition`, and `exception`.
- Auth now follows the same structure: controllers, services, repositories, clients, DTOs, filters, exceptions, and support utilities live under `auth/*`.
- User identity classes now live under user layers: `AppUser` in `user/model`, persistence in `user/repository`, and profile/current-user logic in `user/service` plus `user/controller`.
- The root `controller` package is no longer used. Status is served from `system/controller/StatusController`.

## Why It Matters

- The package layout makes domain boundaries visible before technical layers.
- A developer or AI agent can inspect one feature area, such as `auth`, `board`, or `economy`, without jumping through a global controller or flat service package.
- DTO classes now carry public API shapes for auth and user profile flows, while services keep business orchestration.
- Keeping `/api/auth/**`, `/api/me`, `/api/users/me/profile`, and `/api/status` paths unchanged lets the frontend continue using the same API contract.

## Verification

- `mvn.cmd -DskipTests compile`: build success.
- `mvn.cmd test`: build success, 72 tests run, 0 failures, 0 errors, 0 skipped.
- `rg "package com\\.junglecamp\\.backend\\.controller" backend/src/main/java`: no results.
- `rg "package com\\.junglecamp\\.backend\\.auth;" backend/src/main/java`: no results.
- `rg "package com\\.junglecamp\\.backend\\.user;" backend/src/main/java`: no results.

## Pitfalls And Follow-Ups

- Keep API routes and JSON field names stable when moving controllers or DTOs.
- When adding new backend features, create or reuse a domain package and place classes by layer inside that domain.
- Avoid reintroducing a root `controller`, `auth`, or `user` package; put new code under the correct domain layer.

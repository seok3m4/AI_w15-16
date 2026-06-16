# PostgreSQL Dynamic User Filters

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/user/repository/AppUserRepository.java`
- `backend/src/test/java/com/junglecamp/backend/user/AppUserRepositoryTests.java`

## What Was Applied

- Admin user list queries build `WHERE` predicates only when the related filter is present.
- The default user list request now sends no nullable sentinel parameters such as `? IS NULL`.
- Search and role filters still use bind parameters, while status filters map to fixed SQL predicates.

## Why It Matters

- PostgreSQL cannot always infer the type of a null bind parameter in expressions like `? IS NULL`.
- H2 can allow that pattern, so the bug can be missed by in-memory tests and appear only against the local PostgreSQL database.
- Dynamic predicates keep the SQL explicit and prevent `/api/admin/users` from failing before returning JSON.

## Verification

- `mvn.cmd '-Dtest=AppUserRepositoryTests' test`: passed.
- Manual PostgreSQL reproduction confirmed the old query failed with `could not determine data type of parameter $1`.
- Authenticated admin request to `/api/admin/users`: returned `200 application/json`.
- Vite proxied admin request to `http://localhost:5173/api/admin/users`: returned `200 application/json`.

## Pitfalls And Follow-Ups

- Avoid nullable sentinel predicates in PostgreSQL-facing JDBC queries unless the parameter type is explicitly cast.
- If API errors are redirected to `/login`, check whether an internal exception is being forwarded to `/error` and masked by web security.

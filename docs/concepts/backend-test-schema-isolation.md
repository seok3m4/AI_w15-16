# Backend Test Schema Isolation

## Where It Appears

- `backend/src/test/java/com/junglecamp/backend/user/AppUserServiceTests.java`
- `backend/src/main/java/com/junglecamp/backend/user/repository/AppUserRepository.java`

## What Was Applied

- Tests that manually create `app_users` also add every column currently read or written by `AppUserRepository`.
- The test setup uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so it remains stable whether the table was created by this test first or by another Spring test context earlier.

## Why It Matters

- CI can execute test classes in a different order from a local run.
- If a test relies on another test to create a newer table shape first, CI may fail with missing-column SQL errors even when local full-suite tests pass.
- Keeping the manual test schema aligned with repository SQL removes that order dependency.

## Verification

- `mvn -Dtest=AppUserServiceTests test`: passed, 3 tests.
- `mvn test`: passed, 97 tests.

## Pitfalls And Follow-Ups

- When adding a new column to `app_users` and referencing it in raw SQL, update manual test schemas at the same time.
- Prefer shared schema helpers or migration-backed test setup if more repository tests start creating tables manually.

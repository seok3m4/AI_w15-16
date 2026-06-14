# Board CRUD, Search, PostgreSQL, RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build post CRUD, comments, tags, keyword search, PostgreSQL/RDS-ready schema, and RAG-ready pgvector tables.

**Architecture:** Spring Boot exposes JSON APIs backed by JPA entities and repositories. PostgreSQL schema is managed by Flyway, while tests use an isolated profile with H2 and Flyway disabled. Ionic React renders a board workspace that calls the backend API through Vite proxy.

**Tech Stack:** Spring Boot, Spring Data JPA, Flyway, PostgreSQL, pgvector schema, H2 test profile, Ionic React, TypeScript.

---

### Task 1: Backend Board API Tests

**Files:**
- Modify: `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`

- [ ] **Step 1: Add failing MockMvc tests**

Add tests for:

- public empty post list
- authenticated create post with normalized tags
- public search by keyword and tag
- authenticated update post
- authenticated create/update/delete comment
- authenticated delete post

- [ ] **Step 2: Run backend tests and verify RED**

Run:

```powershell
cd backend
.\mvnw.cmd -Dtest=ApiIntegrationTests test
```

Expected: tests fail because `/api/posts` and `/api/tags` do not exist yet.

### Task 2: Backend Persistence And API

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/resources/application.properties`
- Create: `backend/src/main/resources/application-test.properties`
- Create: `backend/src/main/resources/db/migration/V1__create_board_and_rag_schema.sql`
- Create: `backend/src/main/java/com/junglecamp/backend/board/BoardPost.java`
- Create: `backend/src/main/java/com/junglecamp/backend/board/BoardComment.java`
- Create: `backend/src/main/java/com/junglecamp/backend/board/BoardTag.java`
- Create: `backend/src/main/java/com/junglecamp/backend/board/BoardPostRepository.java`
- Create: `backend/src/main/java/com/junglecamp/backend/board/BoardTagRepository.java`
- Create: `backend/src/main/java/com/junglecamp/backend/board/BoardPostDtos.java`
- Create: `backend/src/main/java/com/junglecamp/backend/board/BoardPostService.java`
- Create: `backend/src/main/java/com/junglecamp/backend/controller/BoardPostController.java`
- Modify: `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`

- [ ] **Step 1: Add dependencies and configuration**

Add Spring Data JPA, PostgreSQL JDBC, Flyway, Flyway PostgreSQL support, and H2 test dependency. Configure datasource values through `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`.

- [ ] **Step 2: Add entities and repositories**

Create post, comment, and tag entities with JPA relationships and timestamp fields.

- [ ] **Step 3: Add service and controller**

Implement post list/search, create, detail, update, delete, comment create/update/delete, and tag list.

- [ ] **Step 4: Run backend tests and verify GREEN**

Run:

```powershell
cd backend
.\mvnw.cmd -Dtest=ApiIntegrationTests test
```

Expected: `BUILD SUCCESS`.

### Task 3: Frontend Board Workspace

**Files:**
- Create: `front/src/api/posts.ts`
- Modify: `front/src/pages/HomePage.tsx`
- Modify: `front/src/pages/HomePage.css`

- [ ] **Step 1: Add typed API client**

Create functions for post list, detail, create, update, delete, comment create/update/delete, and tag list.

- [ ] **Step 2: Replace connection panel with board workspace**

Render search input, tag filters, post list, composer form, selected post detail, and comments. Keep login action visible when no backend session exists.

- [ ] **Step 3: Verify frontend**

Run:

```powershell
cd front
npm run lint
npm run build
```

Expected: lint and build succeed.

### Task 4: Documentation And Study Notes

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Create: `docs/concepts/board-rag-postgresql.md`
- Create or modify: `docs/work-logs/2026-06-12-board-crud-rag-postgresql.md`
- Modify: `study/postgresql-rds-rag.md`
- Modify: `study/board-crud-api.md`

- [ ] **Step 1: Document API contract and DB/RAG concept**

Add endpoint, schema, local/RDS config, and RAG extension notes.

- [ ] **Step 2: Verify docs and final status**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; changed files match implementation scope.

## Self-Review

- Spec coverage: Covers post CRUD, comments, tags, search screen, PostgreSQL/RDS configuration, and RAG-ready schema.
- Placeholder scan: No TODO/TBD placeholders are used.
- Type consistency: API paths and DTO names match the intended controller and frontend client boundaries.

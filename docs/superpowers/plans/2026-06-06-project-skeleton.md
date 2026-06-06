# CineReview AI Project Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable skeleton for CineReview AI with a React frontend, NestJS backend, PostgreSQL container, Prisma base schema, and a verified health check flow.

**Architecture:** The repository uses an npm workspace layout with `apps/web` for the React/Vite client and `apps/api` for the NestJS REST API. PostgreSQL runs through Docker Compose, Prisma owns the database schema from the API package, and the frontend calls the backend through `VITE_API_BASE_URL`.

**Tech Stack:** React, Vite, TypeScript, NestJS, PostgreSQL, Prisma, Docker Compose, npm workspaces.

---

### Task 1: Workspace Files

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Create a root npm workspace**

Create a root `package.json` with scripts for the web app, API app, Prisma, Docker, build, and tests.

- [ ] **Step 2: Add root environment documentation**

Create `.env.example` with `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `TMDB_API_KEY`, `PORT`, `FRONTEND_URL`, and `VITE_API_BASE_URL`.

- [ ] **Step 3: Ignore generated and local files**

Create `.gitignore` for `node_modules`, build outputs, `.env`, Prisma generated artifacts, logs, and local IDE files.

### Task 2: React App

**Files:**
- Create: `apps/web/*`

- [ ] **Step 1: Scaffold React with Vite**

Run `npm create vite@latest apps/web -- --template react-ts`.

- [ ] **Step 2: Replace starter UI with a health-check dashboard**

Implement a compact React page that calls `${VITE_API_BASE_URL}/health`, displays API status, and shows the selected stack.

- [ ] **Step 3: Verify the frontend build**

Run `npm run build -w apps/web`.

### Task 3: NestJS API

**Files:**
- Create: `apps/api/*`

- [ ] **Step 1: Scaffold NestJS API**

Run `npx @nestjs/cli@latest new apps/api --package-manager npm --skip-git`.

- [ ] **Step 2: Implement health endpoint**

Expose `GET /health` returning `{ status: "ok", service: "cine-review-api", timestamp: string }`.

- [ ] **Step 3: Enable CORS from frontend URL**

Read `FRONTEND_URL` and `PORT` from environment variables in `main.ts`.

- [ ] **Step 4: Verify API tests and build**

Run `npm test -w apps/api` and `npm run build -w apps/api`.

### Task 4: PostgreSQL and Prisma

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/prisma/*`

- [ ] **Step 1: Add PostgreSQL service**

Create `docker-compose.yml` with PostgreSQL 16 using the `pgvector/pgvector` image.

- [ ] **Step 2: Install Prisma dependencies in API**

Install `prisma` as a dev dependency and `@prisma/client` as a runtime dependency for `apps/api`.

- [ ] **Step 3: Add initial Prisma schema**

Create `User`, `Movie`, `Review`, `Comment`, `Tag`, and `ReviewTag` models. Keep vector storage for the next RAG phase.

- [ ] **Step 4: Add Prisma service module**

Create a NestJS `PrismaService` that manages database connections.

- [ ] **Step 5: Verify Prisma schema formatting**

Run `npm run prisma:format -w apps/api`.

### Task 5: Documentation and Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Document project purpose, stack, structure, setup commands, and the stage-1 verification checklist.

- [ ] **Step 2: Run final verification**

Run the frontend build, API tests, API build, and Prisma format command.

# Local Env File Loading

## Where It Appears

- `backend/src/main/resources/application.properties`
- `front/vite.config.ts`
- `.env.local.example`
- `.gitignore`
- `backend/src/test/java/com/junglecamp/backend/EnvironmentFileConfigTests.java`

## What Was Applied

- The repository root `.env.local` is the standard local runtime settings file.
- Spring Boot imports `.env.local` automatically when the backend runs from the repository root or from `backend/`.
- Vite loads env files from the repository root through `envDir: "../"`.
- `.env.local.example` documents the expected local keys without real secrets.

## Why It Matters

- `FRED_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` can be configured in one local file.
- The backend reads server-only secrets from `.env.local`.
- The frontend only exposes variables prefixed with `VITE_`, so backend secrets stay out of browser code.

## File Locations

- Canonical local file: `.env.local`
- Example file to copy from: `.env.local.example`
- Agent-only file: `.env.agents.local`
- Frontend no longer needs a separate `front/.env.local` for this project unless a future workflow deliberately opts into one.

## Local First-Run Flow

Run this order whenever the local app starts from a clean machine or after Docker/Desktop restart:

1. Start Docker Desktop.
2. Start PostgreSQL/pgvector:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-postgres.ps1
```

3. Confirm `.env.local` exists in the repository root and includes at least:

```env
FRED_API_KEY=
OPENAI_API_KEY=
OPENAI_AGENT_MODEL=gpt-5.5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_BOARD_URL=http://localhost:5173/home
AGENT_WORKER_URL=http://localhost:8090
AGENT_WORKER_TOKEN=local-agent-token
AGENT_MCP_URL=http://localhost:8090/mcp/
AGENT_BACKEND_INTERNAL_URL=http://localhost:8080
```

4. Start the backend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-backend.ps1
```

5. Start the frontend:

```powershell
cd front
npm.cmd run dev
```

For Agent Workbench development, install and start the Python worker between the backend and frontend:

```powershell
python -m pip install -r agent-worker\requirements.txt
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-agent-worker.ps1
```

The backend log is written to `.local-logs/backend.log`, which is intentionally ignored by Git.

## Verification

- `mvn -Dtest=EnvironmentFileConfigTests test`: verifies backend imports root `.env.local` paths.
- `npm.cmd run build`: verifies Vite accepts the root env directory configuration.
- `powershell -ExecutionPolicy Bypass -File .\scripts\start-local-postgres.ps1`: starts or reuses the local pgvector PostgreSQL container.
- `powershell -ExecutionPolicy Bypass -File .\scripts\start-local-backend.ps1`: starts the backend, applies Flyway migrations, and writes `.local-logs/backend.log`.
- `powershell -ExecutionPolicy Bypass -File .\scripts\start-local-agent-worker.ps1`: starts the Python Agent worker on `http://localhost:8090`.
- `Invoke-WebRequest http://localhost:8080/api/us-economy/dashboard`: returned `200 OK` with 12 FRED-backed metrics after startup sync.
- `docker exec jungle-ai-postgres psql -U jungle -d jungle_ai -c "select count(*) from economy_metric_snapshots;"`: returned 12 metric snapshots.

## Pitfalls And Follow-Ups

- Changing `.env.local` requires restarting the backend and Vite dev servers.
- Do not quote values unless the quote is part of the value.
- `.env.agents.local` is for Codex/agent workflow settings and is not the application runtime config.
- Production should still use deployment environment variables or a secret manager, not a checked-in env file.

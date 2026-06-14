# Python Agent Workbench

## Where It Appears

- `agent-worker/app/`
- `backend/src/main/java/com/junglecamp/backend/agent/`
- `backend/src/main/java/com/junglecamp/backend/rag/`
- `front/src/pages/AgentWorkbench.tsx`
- `scripts/start-local-agent-worker.ps1`

## What Was Applied

- The dashboard keeps the verified FRED-backed economy cache in Spring Boot.
- A separate Python worker owns the OpenAI Agents SDK workflow for briefing and chat runs.
- Spring calls the worker only through authenticated `/api/agents/**` endpoints and stores `agent_runs`, `agent_steps`, and `agent_messages`.
- The Python worker exposes a Streamable HTTP MCP endpoint at `/mcp` when `mcp` is installed.
- The FastMCP app is mounted with an internal `/` streamable path and its session manager is started from the main FastAPI lifespan; otherwise the Agent SDK can fail with redirect/session-terminated errors before answering.
- MCP tools are read-only: `economic_indicator_search`, `latest_fred_snapshot`, `related_news_search`, and `rag_search`.
- The Agent tab no longer creates a run on open. It loads the catalog and saved history only; users explicitly click Agent creation to call the worker.
- `POST /api/agents/runs/briefing` is the primary manual Agent generation action. Each click creates a new `run_type=briefing` row from the current dashboard and RAG context.
- `GET /api/agents/summary` is read-only for compatibility. It returns an existing summary run when one exists, and returns `404` instead of generating a new worker request when none exists.
- Users choose from a server-owned Agent catalog instead of writing custom prompts.
- Catalog chat uses the `DASHBOARD_RAG_STRICT_EVIDENCE` policy: it may use verified dashboard tools and RAG search, but it returns `insufficient_evidence` when it cannot cite verified evidence.
- Chat answers store `answerStatus`, evidence ids, message-scoped `agent_evidence_items`, and message-scoped `agent_steps` so each assistant message can show its own source trail.
- The frontend `Agent` tab inside `/home` keeps chat as the primary work area, with compact Agent chips, pending user/assistant bubbles while a response is being generated, and internally scrolling message/history panels. Chat is disabled until a saved run is selected or a new Agent is created.
- Agent history deletion is a run-level soft delete: `agent_runs.hidden_at` hides the run from user APIs while preserving messages, steps, and evidence rows for database-level recovery.
- The Agent history UI calls this action delete, while the backend keeps the soft-delete implementation.

## Why It Matters

- Python can use the official `openai-agents` package while the existing Java backend remains the authority for users, sessions, and verified economy data.
- Agent output is saved with trace steps and chat messages, so users can inspect the run later.
- Evidence guardrails run in both the worker and Spring so unknown or unsourced metric ids cannot become saved evidence.
- News and RAG evidence are saved as `agent_evidence_items` so the UI can show the sourced material behind a run.
- Message-level evidence prevents the chat from feeling like an unconstrained autonomous analyst: every non-fallback answer is tied to the exact evidence and trace used for that message.
- The catalog keeps v1 safe: users can select a role, but only server-defined role instructions reach the worker.

## API Contract And Flow

- `GET /api/agents/runs`: list the current user's recent runs.
- `GET /api/agents/summary`: return the latest saved `run_type=summary` run for compatibility; missing summaries return `404` and never call the worker.
- `POST /api/agents/summary/refresh`: compatibility endpoint that can still force a new `run_type=summary` run, but the frontend no longer uses it.
- `GET /api/agents/catalog`: return the server-defined Agent catalog.
- `POST /api/agents/chat`: append a message to the selected saved run using `{ "agentId": "...", "runId": 1, "message": "..." }`; missing `runId` returns `400` and does not create a summary.
- `POST /api/agents/runs/briefing`: create a new explicit Agent briefing run from the current `/api/us-economy/dashboard` data. This is the UI's Agent creation action.
- `GET /api/agents/runs/{runId}`: read a saved run, steps, and messages.
- `DELETE /api/agents/runs/{runId}`: hide a saved run for the current user with `204 No Content`; hidden or non-owned runs return `404`.
- `POST /api/agents/runs/{runId}/chat`: legacy-compatible chat for a saved run, using the beginner explainer Agent by default.
- Spring adds the internal worker policy `DASHBOARD_RAG_STRICT_EVIDENCE`.
- Chat response messages include `answerStatus`, `evidenceMetricIds`, `evidenceEventIds`, `evidenceNewsIds`, `evidenceRagChunkIds`, `evidenceItems`, and `steps`.
- Spring sends worker calls to `AGENT_WORKER_URL` with `X-Agent-Worker-Token`.
- Spring uses an HTTP/1.1 request factory for worker calls so Uvicorn does not receive an unsupported `Upgrade: h2c` request and drop the JSON body.
- Worker endpoints are `POST /agent/briefing` and `POST /agent/chat`; chat receives `agentId`.
- Worker MCP endpoint is `http://localhost:8090/mcp/`; the worker normalizes this URL with a trailing slash to avoid FastAPI's 307 redirect.
- Internal Spring tool endpoints are under `/api/internal/agent-tools/**` and require `X-Agent-Worker-Token`.
- `GET /api/internal/agent-tools/rag-search` returns board/RAG chunk evidence with source URLs.
- `related_news_search` remains available in the MCP server, but the saved-run catalog chat path limits tool use to dashboard and RAG evidence by default.

## Local Run Commands

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-postgres.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-backend.ps1
python -m pip install -r agent-worker\requirements.txt
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-agent-worker.ps1
cd front
npm.cmd run dev
```

## Verification

- `mvn -Dtest=ApiIntegrationTests#rejectsAnonymousAgentRequests+createsAgentBriefingRunWithStepsAndMessagesForAuthenticatedUser+storesFallbackRunWhenAgentWorkerFails+rejectsUnsourcedAgentEvidenceAndStoresFailedRun+appendsAgentChatMessagesForAuthenticatedRunOwner test`: verifies the Spring Agent API contract.
- `mvn -Dtest=ApiIntegrationTests#agentSummaryIsReadOnlyAndRefreshCreatesManualSummaryRun+rejectsCatalogAgentChatWithoutRunIdAndDoesNotCreateSummaryRun+chatsWithSelectedCatalogAgentAgainstSelectedBriefingRun+createsAgentBriefingRunWithStepsAndMessagesForAuthenticatedUser test`: verifies that opening/listing the Agent workbench does not create worker runs, manual Agent generation creates fresh briefing runs, and chat requires an existing run.
- `mvn -Dtest=ApiIntegrationTests#appendsAgentChatMessagesForAuthenticatedRunOwner+downgradesAnsweredAgentChatWithoutEvidenceToInsufficientEvidence test`: verifies message-level chat evidence and strict evidence downgrades.
- `mvn -Dtest=ApiIntegrationTests#storesAgentNewsAndRagEvidenceItemsFromWorker+rejectsUnsourcedNewsEvidenceAndStoresFailedRun+indexesBoardPostsForInternalRagSearch test`: verifies MCP evidence persistence and RAG indexing/search.
- `mvn -Dtest=ApiIntegrationTests#softDeletesAgentRunHistoryForOwnerAndKeepsSavedArtifacts+rejectsAnonymousAgentRequests test`: verifies Agent history soft delete and authorization behavior.
- `mvn -Dtest=HttpAgentWorkerClientTests test`: verifies Spring sends JSON bodies to the Python worker without HTTP/2 cleartext upgrade headers.
- `python -m pytest agent-worker\tests`: verifies worker schema and evidence guardrails.
- `docker exec jungle-ai-postgres psql -U jungle -d jungle_ai -c "... agent_runs WHERE hidden_at IS NOT NULL ..."`: returned 0 hidden Agent runs after local cleanup.
- `npm.cmd run lint`: verifies frontend static rules.
- `npm.cmd run build`: verifies the frontend Agent tab and workbench compile.

## Pitfalls And Follow-Ups

- `OPENAI_API_KEY` and `OPENAI_AGENT_MODEL` belong in root `.env.local`; do not expose them as `VITE_*`.
- If the Python worker is not running, Spring stores a fallback run instead of failing the app.
- Soft-deleted history is intentionally not recoverable from the user UI in v1; database recovery clears `agent_runs.hidden_at`.
- If chat or briefing returns `422 Unprocessable Content` while the worker logs `Unsupported upgrade request`, check that the Spring worker client is not sending `Upgrade: h2c`.
- v1 intentionally excludes paid tick-level market data and direct FRED/BLS/BEA calls inside the Agent worker.
- Hybrid RAG falls back to keyword search when `OPENAI_API_KEY` is missing or pgvector semantic search is unavailable.
- A later version can add user custom Agents, streaming, approval-based publication to `/home`, and eval datasets from saved `agent_steps`.

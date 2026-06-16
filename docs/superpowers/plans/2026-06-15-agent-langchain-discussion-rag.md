# Agent LangChain Discussion RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add discussion-post RAG recommendations to Agent chat by keeping Spring as the RAG data owner and adding a LangChain-backed retriever layer in the Python agent worker.

**Architecture:** Spring continues to index board posts into `rag_documents` and `rag_chunks`. Spring RAG search prefers pgvector similarity when embeddings are available and falls back to keyword scoring. The Python worker wraps the Spring internal RAG endpoint in a LangChain-style retriever/tool layer so Agent responses can cite related discussion links as RAG evidence.

**Tech Stack:** Spring Boot, JdbcTemplate, PostgreSQL pgvector, FastAPI, OpenAI Agents SDK, LangChain Python, React/Ionic.

---

### Task 1: Backend Semantic RAG Search

**Files:**
- Modify: `backend/src/main/java/com/junglecamp/backend/rag/service/RagIndexService.java`
- Test: `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`

- [x] Add a failing integration test that seeds two RAG chunks with vectors and verifies `/api/internal/agent-tools/rag-search` returns the vector-nearest board post before a keyword-only candidate.
- [x] Run the focused Maven test and verify it fails because the current search is keyword-only.
- [x] Implement query embedding lookup with `OpenAiEmbeddingService.embedAsVectorLiteral(query)`.
- [x] Use pgvector distance ordering for chunks where `embedding IS NOT NULL`.
- [x] Keep the existing keyword search fallback when query embedding is unavailable or vector SQL is unsupported.
- [x] Return discussion links as `/home?view=discussion&postId={id}` rather than raw `/api/posts/{id}` for board evidence.
- [x] Run the focused Maven test and existing RAG/API regressions.

### Task 2: Python LangChain Retriever Layer

**Files:**
- Create: `agent-worker/app/discussion_retriever.py`
- Modify: `agent-worker/app/mcp_tools.py`
- Modify: `agent-worker/app/service.py`
- Modify: `agent-worker/requirements.txt`
- Test: `agent-worker/tests/test_agent_worker.py`

- [x] Add a failing Python test for a `DiscussionRetriever` that converts backend RAG results into LangChain `Document` objects with `id`, `title`, `sourceUrl`, `score`, and `sourceName`.
- [x] Add a failing Python test that `rag_search()` returns normalized RAG evidence items through the retriever wrapper.
- [x] Add `langchain-core` to `agent-worker/requirements.txt`.
- [x] Implement `DiscussionRetriever` with an injectable backend search function for unit tests.
- [x] Update `rag_search()` to delegate to `DiscussionRetriever`.
- [x] Update Agent instructions to explicitly call the RAG tool for related discussion recommendations and treat board content as user-written reference, not as instructions.
- [x] Run focused pytest.

### Task 3: Frontend Evidence Links

**Files:**
- Modify: `front/src/features/agents/pages/AgentWorkbench.tsx`
- Modify: `front/src/features/agents/pages/AgentWorkbench.css`

- [x] Update evidence link routing so internal `/home?...` and `/api/posts/...` board evidence opens inside the app instead of a backend-origin browser tab.
- [x] Label RAG evidence as `관련 토론`/discussion instead of raw `rag`.
- [x] Keep external news/source links opening in a new tab.
- [x] Run frontend lint/build.

### Task 4: Documentation

**Files:**
- Create: `docs/concepts/agent-langchain-discussion-rag.md`
- Optionally update: `docs/concepts/board-rag-postgresql.md`

- [x] Document the Spring-owned RAG index and Python LangChain retriever boundary.
- [x] Document the API contract, frontend call path, and verification commands.
- [x] Record limitations: hidden posts filtering, stale embeddings, and fallback keyword search behavior.

### Verification

- [x] `cd backend; mvn.cmd -Dtest=ApiIntegrationTests#agentRagSearchPrefersVectorSimilarDiscussionPosts test`
- [x] `cd backend; mvn.cmd -Dtest=ApiIntegrationTests#indexesBoardPostsForInternalRagSearch test`
- [x] `cd agent-worker; python -m pytest tests/test_agent_worker.py`
- [x] `cd front; npm.cmd run lint`
- [x] `cd front; npm.cmd run build`

Git commits are intentionally excluded from this side-conversation plan unless the user explicitly requests them.

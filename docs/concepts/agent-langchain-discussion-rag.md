# Agent LangChain Discussion RAG

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/rag/service/RagIndexService.java`
- `backend/src/main/java/com/junglecamp/backend/agent/controller/AgentToolController.java`
- `agent-worker/app/discussion_retriever.py`
- `agent-worker/app/mcp_tools.py`
- `agent-worker/app/service.py`
- `front/src/features/agents/pages/AgentWorkbench.tsx`
- `front/src/features/agents/pages/AgentWorkbench.css`

## What Was Applied

- Spring Boot remains the owner of discussion post indexing and RAG storage.
- Board posts are indexed into `rag_documents` and `rag_chunks`; embeddings are stored in `rag_chunks.embedding`.
- RAG search now prefers semantic similarity when a query embedding is available.
- PostgreSQL pgvector search is attempted first. H2/test or unsupported vector SQL falls back to in-process vector scoring.
- Python Agent worker adds a LangChain-compatible `DiscussionRetriever` that wraps the Spring internal RAG endpoint.
- Agent MCP `rag_search` returns sourced `rag` evidence items with board discussion URLs.
- Frontend Agent evidence links route board-post RAG evidence into `/home?view=discussion&postId=...`.

## Why It Matters

- The project keeps a clean boundary: Spring owns board data, persistence, and access rules; Python owns Agent orchestration.
- LangChain is introduced where it is useful: the Python Agent retriever/tool layer.
- Discussion posts are treated as user-written context, not official economic data.
- Related discussion links become directly inspectable from Agent answers without sending users to raw backend API URLs.

## API Contract

- Agent worker calls:
  - `GET /api/internal/agent-tools/rag-search?query={query}&sourceTypes=BOARD_POST&limit=3`
- Response items include:
  - `id`
  - `sourceType`
  - `sourceId`
  - `title`
  - `sourceName`
  - `sourceUrl`
  - `snippet`
  - `observedAt`
  - `score`
- Board RAG evidence URLs use:
  - `/home?view=discussion&postId={postId}`

## Frontend Call Path

- `AgentWorkbench` receives `AgentMessage.evidenceItems`.
- `type=rag` and `sourceName=BOARD_POST` are labeled as related discussion evidence.
- Internal discussion URLs use React Router navigation.
- External news/source URLs still open in a new tab.

## Verification

- `mvn.cmd '-Dtest=ApiIntegrationTests#agentRagSearchPrefersVectorSimilarDiscussionPosts' test`: passed.
- `mvn.cmd '-Dtest=ApiIntegrationTests#indexesBoardPostsForInternalRagSearch' test`: passed after retrying a transient Maven class-file read issue.
- `python -m pytest tests/test_agent_worker.py`: passed, 20 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed with the existing Vite large chunk warning.

## Pitfalls And Follow-Ups

- Local Python tests can run without `langchain-core`; production installs it through `agent-worker/requirements.txt`.
- Existing RAG rows without embeddings fall back to keyword search until posts are reindexed.
- pgvector indexing should be added for larger datasets, for example an HNSW or IVFFlat index on `rag_chunks.embedding`.
- Hidden board posts are filtered from RAG search for `BOARD_POST` sources; keep this behavior aligned with future moderation rules.

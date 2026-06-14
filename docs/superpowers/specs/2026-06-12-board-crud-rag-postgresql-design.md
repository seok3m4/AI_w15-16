# Board CRUD, Search, PostgreSQL, RAG Design

## Goal

게시글 CRUD, 댓글, 태그, 검색 화면을 구성하고 PostgreSQL/RDS 전환이 쉬운 DB 설계를 추가한다. RAG 기능은 즉시 검색 UI와 게시글 데이터를 해치지 않도록 별도 문서/청크/임베딩 테이블로 확장 가능하게 설계한다.

## Scope

- Backend API for posts, comments, tags, and search.
- Frontend board workspace with search, tag filters, post list, post form, detail, and comments.
- PostgreSQL-first schema with local and RDS datasource switching by environment variables.
- RAG-ready schema using `pgvector` for embeddings.
- Study notes under `study/` explaining PostgreSQL/RDS/pgvector/RAG concepts.

## Backend Design

- Use Spring Data JPA for relational entities:
  - `board_posts`: title, content, author, timestamps.
  - `board_comments`: post id, content, author, timestamps.
  - `board_tags`: normalized unique tag names.
  - `board_post_tags`: many-to-many join table.
- Add Flyway migrations for PostgreSQL schema. The schema includes `CREATE EXTENSION IF NOT EXISTS vector` and RAG tables. In local environments without pgvector, the app can still run via JPA test profile with Flyway disabled.
- Keep current session-based authentication. Public read APIs are allowed for list/detail/tag search. Write APIs require authentication and use `Principal.getName()` as the author.
- Disable CSRF only for `/api/**` so frontend `fetch` can create/update/delete through the API while web form login remains separate.

## API Design

- `GET /api/posts?query=&tag=`: list posts, newest first.
- `POST /api/posts`: create post.
- `GET /api/posts/{id}`: read post detail with comments and tags.
- `PUT /api/posts/{id}`: update post title/content/tags.
- `DELETE /api/posts/{id}`: delete post.
- `POST /api/posts/{id}/comments`: create comment.
- `PUT /api/posts/{id}/comments/{commentId}`: update comment.
- `DELETE /api/posts/{id}/comments/{commentId}`: delete comment.
- `GET /api/tags`: list tags by name.

## Frontend Design

- Replace the current connection-only home page with a board workspace.
- Keep a compact operational layout, not a landing page.
- Top toolbar: app title, refresh, backend login when no session exists.
- Left/main list area: search input, tag chips, post list.
- Right/detail area: selected post detail, edit/delete actions, comment list, comment form.
- Composer area: create/update post form with comma-separated tags.
- If unauthenticated, read/search remains available and write controls show a login action.

## RAG-Ready DB Design

- `rag_documents`: source type, source id, title, content hash, timestamps.
- `rag_chunks`: document id, chunk index, text, token count, embedding vector, metadata JSONB.
- `rag_index_jobs`: indexing status for future background processing.
- Posts can later be converted into RAG documents by using `source_type='BOARD_POST'` and `source_id=<post id>`.
- PostgreSQL local and RDS both use the same schema. RDS migration only changes datasource URL, username, password, and SSL-related options.

## Testing Design

- Backend tests first:
  - anonymous users can search/read posts.
  - authenticated users can create, update, delete posts.
  - authenticated users can create/update/delete comments.
  - tags are normalized and searchable.
- Frontend verification:
  - `npm run lint`
  - `npm run build`
- Backend verification:
  - targeted MockMvc tests
  - full `.\mvnw.cmd test`

## Follow-Ups

- Replace in-memory login users with database users.
- Add pagination when the post count grows.
- Add real embedding generation and background indexing.
- Add RDS SSL settings once the RDS instance is created.

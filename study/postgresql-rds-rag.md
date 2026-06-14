# PostgreSQL, RDS, pgvector, RAG Study Notes

## PostgreSQL In This Project

PostgreSQL is the main relational database target. Local development can run PostgreSQL in Docker, and production can use Amazon RDS PostgreSQL. The application should not care whether the host is local or RDS; it reads connection values from environment variables.

Important Spring settings:

```properties
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/jungle_ai}
spring.datasource.username=${DB_USERNAME:jungle}
spring.datasource.password=${DB_PASSWORD:jungle}
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
```

The RDS migration path should be endpoint-only from the app's point of view:

```text
Local: jdbc:postgresql://localhost:5432/jungle_ai
RDS:   jdbc:postgresql://<rds-endpoint>:5432/jungle_ai
```

In practice, RDS also requires security group access, subnet routing, credentials, and sometimes SSL options.

## Why Flyway

Flyway stores schema changes as versioned SQL files. This keeps local PostgreSQL and RDS PostgreSQL consistent.

Example:

```text
backend/src/main/resources/db/migration/V1__create_board_and_rag_schema.sql
```

When the app starts, Flyway applies migrations that have not yet run.

## Board Schema

Core tables:

- `board_posts`: main article table.
- `board_comments`: comments linked to posts.
- `board_tags`: unique normalized tag names.
- `board_post_tags`: join table because one post can have many tags and one tag can belong to many posts.

This design avoids storing tags as comma-separated text, which would make filtering and cleanup harder.

## pgvector

`pgvector` adds a vector column type to PostgreSQL. It lets PostgreSQL store embeddings such as `vector(1536)`.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

For RAG, each text chunk can store:

- the chunk text
- metadata
- an embedding vector

Later, semantic search can compare a question embedding to stored chunk embeddings.

## RAG Table Shape

Recommended separation:

- `rag_documents`: one logical source document, such as a board post.
- `rag_chunks`: smaller searchable text pieces from a document.
- `rag_index_jobs`: indexing status for background processing.

This separation matters because RAG search usually works on chunks, not whole posts.

## RDS Migration Notes

To move from local PostgreSQL to RDS:

1. Create RDS PostgreSQL with a version that supports `pgvector`.
2. Enable network access from ECS tasks to RDS.
3. Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` in ECS task definition or Secrets Manager.
4. Start the app and let Flyway apply migrations.
5. Verify `/api/posts` and future RAG endpoints.

## Common Pitfalls

- RDS endpoint changes do not help if the ECS security group cannot reach RDS.
- `pgvector` must be available in the chosen PostgreSQL/RDS version.
- `ddl-auto=create` is unsafe in production. Use Flyway and `ddl-auto=validate`.
- Embedding dimensions must match the model. If the model outputs 1536 dimensions, use `vector(1536)`.

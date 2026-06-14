# Board CRUD And Search Study Notes

## API Resource Shape

The board API uses resource-oriented endpoints:

```text
GET    /api/posts
POST   /api/posts
GET    /api/posts/{id}
PUT    /api/posts/{id}
DELETE /api/posts/{id}
POST   /api/posts/{id}/comments
PUT    /api/posts/{id}/comments/{commentId}
DELETE /api/posts/{id}/comments/{commentId}
GET    /api/tags
```

## Public Read, Authenticated Write

Read endpoints are public so users can browse and search posts. Write endpoints require login because they create or change user-owned content.

The current project uses Spring Security form login. The frontend calls JSON APIs under `/api/**`.

## Tag Normalization

Tags should be normalized before saving:

- trim whitespace
- remove empty tags
- convert to lowercase
- remove duplicates

This makes `Java`, ` java `, and `JAVA` the same tag.

## Search

Initial search is keyword-based:

- title contains query
- content contains query
- optional tag filter

This works before RAG is implemented. Later, semantic search can query `rag_chunks` and return matching posts.

## Why DTOs

Entities represent database rows. DTOs represent API input/output.

Using DTOs prevents API responses from accidentally exposing internal JPA details and prevents recursive JSON serialization through bidirectional relationships.

# Board Post Tombstone Deletion

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/board/model/BoardPost.java`
- `backend/src/main/java/com/junglecamp/backend/board/service/BoardPostService.java`
- `backend/src/main/java/com/junglecamp/backend/board/dto/BoardPostDtos.java`
- `front/src/features/board/pages/DiscussionBoard.tsx`

## What Was Applied

- User deletion now has two paths:
  - If a post has no visible comments, it is still hidden with `hidden_at`.
  - If a post has visible comments, it is marked with `deleted_at` and returned as a tombstone.
- Tombstone posts return `deleted: true`, title/content/excerpt as `삭제된 게시글입니다.`, empty tags, zero post likes, and the original visible comments.
- Admin hiding still uses `hidden_at`, so moderation hiding remains separate from user deletion.
- RAG indexing is removed when a post becomes a tombstone, so deleted original content is not used for search or Agent context.

## Why It Matters

- Comment discussions can remain readable even when the original author removes the post body.
- The system avoids exposing deleted post text through feed/search/RAG while preserving useful comment data.
- Separating `deleted_at` from `hidden_at` keeps user deletion, admin hiding, and admin hard deletion distinct.

## Verification

- `mvn.cmd '-Dtest=ApiIntegrationTests#deletingPostWithVisibleCommentsKeepsThreadAsDeletedPostTombstone' test`: passed.

## Pitfalls And Follow-Ups

- Tombstone posts are read-only for post-level actions and new comments in the frontend.
- If product policy later allows continued commenting on tombstone threads, backend `createComment` and the comment composer can be relaxed together.

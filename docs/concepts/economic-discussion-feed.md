# Economic Discussion Feed

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/board/BoardPostService.java`
- `backend/src/main/resources/db/migration/V8__extend_board_community_features.sql`
- `backend/src/main/resources/db/migration/V11__seed_ai_discussion_samples.sql`
- `backend/src/main/resources/db/migration/V12__backfill_ai_discussion_sample_posts.sql`
- `backend/src/main/java/com/junglecamp/backend/rag/RagIndexService.java`
- `front/src/i18n/i18n.ts`
- `front/src/pages/DiscussionBoard.tsx`

## What Was Applied

- The existing board CRUD was extended into a community feed with fixed economy categories, free-form tags, post likes, one-level replies, reports, soft hide, and in-app notifications.
- Board reads remain public, while writing, liking, reporting, hiding, and notification APIs require the current authenticated user.
- New posts and comments store `author_user_id`; legacy string authors remain usable as fallback display data.
- Deleted posts and comments are hidden with `hidden_at` so user-facing APIs exclude them while preserving rows for review.
- The discussion UI labels this action as delete, while the backend still uses soft hide for moderation and recovery safety.
- Hidden posts are removed from the RAG document cache so Agent RAG search does not cite hidden community content.

## Why It Matters

- The app can support real user discussion without exposing Google email as the public identity.
- Soft hide and reports give the first operational safety layer without requiring an admin console in v1.
- One-level replies keep discussions readable and avoid the moderation and layout complexity of deeply nested threads.
- Notifications make post/comment conversations resumable without adding email or WebSocket infrastructure.
- Discussion UI strings are routed through the shared frontend i18n provider so the feed changes with the language selector.
- The initial community surface includes 30 AI-generated sample discussion posts, marked in both title/body and with an `AI generated sample` badge in the UI.
- `V12__backfill_ai_discussion_sample_posts.sql` repairs databases where `V11` was already recorded by Flyway but only created the sample users, leaving `board_posts` empty.
- Seeded sample posts also create keyword-searchable RAG rows without embedding calls, while user-created posts still go through the normal RAG indexing service.
- PostgreSQL JSONB metadata writes are cast explicitly in `RagIndexService`, with a fallback for the H2 test schema.
- Empty discussion feed searches pass an empty query string into the repository instead of a nullable `LIKE` parameter. PostgreSQL can otherwise infer the null parameter as `bytea` and fail with `operator does not exist: text ~~ bytea`.

## Verification

- `mvn.cmd -Dtest=ApiIntegrationTests#savesCommunityNicknameAndExposesItFromCurrentUserProfile test`: passed.
- `mvn.cmd -Dtest=ApiIntegrationTests#supportsEconomicDiscussionFeedInteractionsAndNotifications test`: passed.
- `mvn -Dtest=ApiIntegrationTests#seedsThirtyAiGeneratedEconomicDiscussionSamples test`: passed.
- `mvn -Dtest=ApiIntegrationTests#backfillsAiGeneratedDiscussionSamplesWhenV11OnlyCreatedUsers test`: passed.
- `mvn -Dtest=ApiIntegrationTests#supportsEconomicDiscussionFeedInteractionsAndNotifications+indexesBoardPostsForInternalRagSearch test`: passed.
- `mvn.cmd "-Dtest=com.junglecamp.backend.board.BoardPostServiceTests#searchUsesEmptyQueryForUnfilteredFeed" test`: passed.
- `mvn.cmd test`: passed with 51 tests, 0 failures, 0 errors, 0 skipped.
- `docker exec jungle-ai-postgres psql -U jungle -d jungle_ai -c "... hidden_at IS NOT NULL ..."`: returned 0 hidden `board_posts`, `board_comments`, and `agent_runs` after cleanup.
- `mvn.cmd clean test`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed with the existing Vite large chunk warning.

## Pitfalls And Follow-Ups

- v1 reports are stored but do not have an admin review UI.
- v1 likes apply only to posts, not comments.
- Notifications are request/response only; real-time delivery can be added later with polling or WebSocket/SSE.
- Board comments are not currently indexed into RAG, only the post body is.
- Seeded samples are intended for local/demo discussion texture. Real community data should be clearly distinguished from AI-generated samples.
- Flyway migration versions are immutable after success. If a seed migration partially affects data but still succeeds, add a later idempotent backfill migration instead of editing the applied version.
- Keep nullable filter parameters away from JPQL `LIKE` expressions unless they are explicitly cast and verified against PostgreSQL, not only H2.

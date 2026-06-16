# Board Comment Fetch Join Duplication

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/board/repository/BoardPostRepository.java`
- `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`

## What Was Applied

- Board post detail loading now entity-fetches `tags` only.
- `comments` are read inside the existing service transaction through their normal lazy collection query.
- This avoids multiplying comments when a post has multiple tags.

## Why It Matters

- Fetching `tags` and `comments` together can create a SQL row product.
- A post with 3 tags and 2 comments may hydrate as 6 comment entries in the detail response.
- The frontend comment pager then appears to show duplicated comments while moving previous/next.

## Verification

- `mvn.cmd '-Dtest=ApiIntegrationTests#postDetailDoesNotDuplicateCommentsWhenPostHasMultipleTags' test`: passed.

## Pitfalls And Follow-Ups

- Avoid adding multiple collection paths to the same JPA entity graph without checking hydrated collection behavior.
- If detail performance becomes an issue, prefer explicit query batching or a dedicated DTO query over multi-collection fetch joins.

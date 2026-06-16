# Home Aggregate Search

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/search/controller/HomeSearchController.java`
- `backend/src/main/java/com/junglecamp/backend/search/service/HomeSearchService.java`
- `backend/src/main/java/com/junglecamp/backend/search/dto/HomeSearchDtos.java`
- `front/src/features/search/api/homeSearch.ts`
- `front/src/features/search/pages/HomeSearchPage.tsx`
- `front/src/features/economy/pages/HomePage.tsx`

## What Was Applied

- Home topbar search now submits a query and opens `/search?query=...&locale=...` in a new browser window.
- `GET /api/search/home` aggregates three authenticated result groups:
  - `discussions`: recent community posts scored by title, excerpt, category, and tags.
  - `events`: economic calendar items scored by title, interpretation, source, category, and related metric ids.
  - `reports`: generated dashboard reports scored by title, summary, category, source, and related metric ids.
- The backend reuses existing `BoardPostService` and `EconomySupplementService` instead of duplicating data access.
- The frontend result page shows separate sections for 토론, 경제일정, and 리포트.
- Each result card opens the matching in-app page:
  - Discussion cards link to `/home?view=discussion&postId={id}` and select that post in the discussion board.
  - Event cards link to `/home?view=events&eventId={id}`, open the event tab, scroll to the event card, and highlight it.
  - Report cards link to `/home?view=reports&reportId={id}`, open the report tab, scroll to the report card, and highlight it.

## Why It Matters

- Home search becomes a cross-workspace discovery entry point without changing the existing protected discussion/events/reports workspaces.
- Keeping search aggregation server-side avoids forcing the frontend to call multiple protected APIs and merge partial failures.
- The scoring is intentionally simple keyword relevance, which is enough for MVP behavior and can later be replaced by RAG/vector search.

## API Contract

- `GET /api/search/home?query={query}&locale={locale}`
- Authentication: required by the existing `/api/**` security default.
- Response:

```json
{
  "query": "cpi",
  "discussions": [],
  "events": [],
  "reports": []
}
```

## Frontend Call Path

- `HomePage` search form opens `/search`.
- `HomeSearchPage` reads `query` from the URL.
- `fetchHomeSearch()` calls `/api/search/home` with `credentials: "include"`.
- A `401` response is shown as a login-required state with a login/signup link.
- Result cards link back into `HomePage` with `view`, `postId`, `eventId`, or `reportId` URL parameters.
- `HomePage` reads those parameters, switches the workspace, and passes `postId` into `DiscussionBoard` when needed.

## Verification

- `mvn.cmd -Dtest=ApiIntegrationTests#searchesHomeAcrossDiscussionsEventsAndReports test`: passed.
- `mvn.cmd test`: passed, 82 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, Vite reported the existing large chunk warning.
- `npm.cmd run lint`: passed after result-card deep links.
- `npm.cmd run build`: passed after result-card deep links, Vite reported the existing large chunk warning.
- `git diff --check`: passed, with existing line-ending warnings only.
- `Invoke-WebRequest http://localhost:8080/api/status`: returned 200 after backend restart.
- `Invoke-WebRequest http://localhost:5173`: returned 200.

## Pitfalls And Follow-Ups

- Search currently uses keyword scoring over the most recent 50 discussion posts; increase or replace with RAG search when the board grows.
- The aggregate endpoint intentionally follows existing authentication rules. Making it public would require a separate product/security decision.

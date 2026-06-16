# Board Notification Detail Modal

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/board/service/BoardPostService.java`
- `backend/src/main/java/com/junglecamp/backend/board/controller/BoardPostController.java`
- `backend/src/main/java/com/junglecamp/backend/board/dto/BoardPostDtos.java`
- `front/src/features/board/api/posts.ts`
- `front/src/features/economy/pages/HomePage.tsx`
- `front/src/features/board/pages/DiscussionBoard.tsx`
- `front/src/features/board/pages/DiscussionBoard.css`

## What Was Applied

- Board notification responses now include the target post title, category, post excerpt, and related comment content.
- The home notification button opens a detail modal instead of navigating immediately.
- Selecting a notification marks only that notification as read, routes to `/home?view=discussion&postId=...&commentId=...`, opens the discussion post, and highlights the target comment.
- `HomePage` refreshes notification state every 60 seconds while a user is logged in, and refreshes immediately when the browser tab becomes visible again.
- Background polling updates both the modal item list and unread badge count without showing modal loading UI.
- The discussion workspace no longer renders a separate inline notification board. Notification list UI is centralized in the home notification modal, while `DiscussionBoard` stays focused on feed, post detail, and comments.

## Why It Matters

- Users can understand which discussion and comment triggered an alert before leaving the current context.
- The route still remains deep-linkable, so search-like navigation can open the exact discussion target.
- Single-notification read state avoids marking unrelated alerts as read when the user checks one item.
- Polling keeps comment notification badges current even when the user stays on the home screen without reloading.
- Keeping the notification list in one place prevents duplicate notification surfaces when a user opens the discussion workspace.

## Verification

- `mvn.cmd -Dtest=ApiIntegrationTests#supportsEconomicDiscussionFeedInteractionsAndNotifications test`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, with the existing large chunk warning from Vite.
- Static check for `discussion-notifications` in `DiscussionBoard.tsx`: passed after the inline board was removed.

## Pitfalls And Follow-Ups

- Discussion category labels in the modal currently show the raw category id. A future polish pass can map them to i18n labels.
- Notification read/list UI now lives in `HomePage`. Future notification UI changes should avoid adding another list inside `DiscussionBoard` unless there is a separate product reason.
- Polling is intentionally skipped while the tab is hidden. The next `visibilitychange` event refreshes immediately when the tab returns to the foreground.

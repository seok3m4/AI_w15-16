# Admin Hidden Content Moderation

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/admin/controller/AdminController.java`
- `backend/src/main/java/com/junglecamp/backend/admin/service/AdminService.java`
- `front/src/features/admin/pages/AdminPage.tsx`
- `front/src/features/board/pages/DiscussionBoard.tsx`

## What Was Applied

- Admin review uses existing soft-delete markers: `board_posts.hidden_at`, `board_comments.hidden_at`, and `agent_runs.hidden_at`.
- `/api/admin/reports` returns report review context, including the report reason/detail and the reported target title/content/author.
- `DELETE /api/admin/reports/{reportId}` lets admins dismiss a report row without deleting the reported post or comment.
- `/api/admin/content/hidden` returns hidden discussion posts and comments in one moderation feed.
- `/api/admin/agents/runs?visibility=active|hidden|all` separates active Agent runs from user-hidden Agent histories.
- `DELETE /api/admin/agents/runs/{runId}/hard-delete` permanently deletes an Agent run with its messages, trace steps, and evidence rows.
- Normal discussion UI still hides hidden content from users, while admin users see moderation buttons instead of like/report actions.

## Why It Matters

- User-hidden content is not automatically destroyed, so admins can inspect whether it is useless, abusive, or unsafe for future AI/RAG data.
- Reports are reviewable without opening the original discussion first because the console shows both what the reporter wrote and what content was reported.
- Report dismissal is separate from content moderation, so admins can clear low-value or resolved reports while leaving the discussion content untouched.
- Hard deletion is explicit and auditable, which avoids accidental data loss while still allowing cleanup of data that should not remain in DB/RAG dependencies.
- Agent tab behavior stays normal for admins; hidden Agent histories are exposed only inside the admin console.

## API Contract And Frontend Call Path

- `GET /api/admin/reports`
  - Frontend: `fetchAdminReports()` -> `AdminPage` reports tab.
  - Returns `targetType`, `postId`, `commentId`, `postTitle`, `targetContent`, `targetAuthor`, `reporterUserId`, `reason`, `detail`, `createdAt`.
- `DELETE /api/admin/reports/{reportId}`
  - Frontend: `dismissAdminReport()` -> `AdminPage` report action button.
  - Deletes only the `board_reports` row and records `REPORT_DISMISS` in admin audit logs.
- `GET /api/admin/content/hidden`
  - Frontend: `fetchAdminHiddenContent()` -> `AdminPage` hidden content tab.
  - Returns `targetType`, `postId`, `commentId`, `postTitle`, `content`, `author`, `hiddenAt`, `createdAt`.
- `GET /api/admin/agents/runs?visibility=hidden`
  - Frontend: `fetchAdminAgentRuns("hidden")` -> `AdminPage` Agent hidden history section.
  - Returns Agent run rows including `hiddenAt`.
- `DELETE /api/admin/posts/{postId}/hard-delete`
  - Removes RAG document/chunks/jobs, notifications, reports, likes, tag joins, comments, and the post.
- `DELETE /api/admin/comments/{commentId}/hard-delete`
  - Removes reports/notifications for the comment and its direct replies, then deletes replies and the comment.
- `DELETE /api/admin/agents/runs/{runId}/hard-delete`
  - Removes `agent_evidence_items`, `agent_steps`, `agent_messages`, then `agent_runs`.

## Verification

- `mvn.cmd -Dtest=ApiIntegrationTests#protectsAdminApisAndAllowsAdminToModerateContentWithAuditLog test`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, with the existing Vite large chunk warning.

## Pitfalls And Follow-Ups

- Hard deletion is irreversible; keep confirmation dialogs and audit logs visible to admins.
- Dismissing a report is not the same as deleting unsafe content. Use hide/hard-delete actions when the reported post or comment itself should be moderated.
- Current report and hidden content lists are capped at 100 rows. Add paging if moderation volume grows.
- Agent hard delete currently targets a run and direct dependent rows; add broader user-level purge only if a formal data-retention policy requires it.

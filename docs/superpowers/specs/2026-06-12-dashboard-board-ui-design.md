# Dashboard Board UI Design

## Objective

Redesign the board screen to match the dashboard style shown in `img.png`: a calm monochrome SaaS layout with a fixed left navigation rail, a top utility/search bar, thin borders, compact cards, and dense but readable operational content.

This design keeps the existing post CRUD, comments, tags, and search behavior. It changes the presentation layer and login return flow so users understand that the React app is the main entry point.

## Visual Direction

- Use a white and near-white background with thin gray borders.
- Use black as the primary command color.
- Use muted gray for secondary labels, metadata, and helper text.
- Keep card radius at 8px or less.
- Avoid decorative gradients, large hero marketing sections, and colorful dashboard noise.
- Match `img.png` with a left sidebar, top toolbar, dashboard summary cards, data-dense sections, and quiet line-based UI.

## Screen Architecture

The `/home` route becomes a dashboard workspace:

- `AppShell`: owns the full-page grid, sidebar, topbar, and content region.
- `Sidebar`: shows product identity and primary navigation items.
- `Topbar`: contains global search, refresh, login state, and action buttons.
- `BoardDashboard`: displays board summary cards, tag filters, post list, selected post, composer, and comments.

The current implementation may remain in one file during the first pass if that keeps the change small, but the layout should use named sections and class names that can be extracted into components later.

## Main Content Layout

Desktop layout:

- Top summary row:
  - total posts
  - total comments
  - tag count
  - selected filter state
- Middle grid:
  - left: post list and search results
  - right: selected post detail and edit/delete controls
- Lower grid:
  - left: new/edit post composer
  - right: comments and comment composer

Mobile layout:

- Sidebar collapses into a compact brand/header strip.
- Content becomes a single column.
- Search, filters, selected post, composer, and comments stack vertically.

## Login Flow

The frontend remains the main entry point:

- Local UI URL: `http://localhost:5173/home`
- Backend login URL: `http://localhost:8080/login`

The backend form login should return to the frontend board route after successful login:

```text
app.frontend.board-url=http://localhost:5173/home
```

The frontend login action may simply open `http://localhost:8080/login`. After successful authentication, Spring Security redirects to the configured frontend board URL.

## Error And Empty States

- Anonymous users can read/search posts, but write actions should show a clear login action.
- Empty lists should look like quiet dashboard empty states, not warnings.
- API errors should appear in a slim bordered notice near the top of the content area.

## Testing

Verify with:

- `mvn test` in `backend`
- `npm run lint` in `front`
- `npm run build` in `front`
- local HTTP checks:
  - `http://localhost:5173/home`
  - `http://localhost:5173/api/posts`
  - `http://localhost:8080/login`

## Scope Boundaries

This pass does not implement real RAG answer generation, semantic recommendations, or a production account system. It may show placeholders such as "RAG ready" only as operational UI labels backed by existing board data.

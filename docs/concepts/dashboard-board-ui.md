# Dashboard Board UI

## Where It Appears

- `front/src/pages/HomePage.tsx`
- `front/src/pages/HomePage.css`
- `front/src/theme/variables.css`
- `study/dashboard-board-ui.md`

## What Was Applied

- The board page was reorganized as a dashboard shell inspired by `img.png`.
- The visual hierarchy uses a fixed sidebar, top search bar, summary cards, post list, selected post detail, composer, and comments area.
- The color system was reduced to a monochrome operational palette with thin borders and compact cards.
- The login action stays connected to the backend login page, while the successful login target remains the frontend board route.

## Why It Matters

- This project is moving from a simple CRUD board toward a PostgreSQL/RDS and RAG-backed knowledge workspace.
- A dashboard structure makes the current board data feel like an operational knowledge base instead of a plain form page.
- The layout leaves clear future spaces for RAG status, AI summaries, semantic search, related documents, and indexing jobs.

## Verification

- `npm.cmd run lint`: exit code 0.
- `npm.cmd run build`: exit code 0; Vite chunk-size warning is acceptable.
- `mvn test`: 12 tests, failures 0, errors 0, skipped 0.
- `Invoke-WebRequest http://localhost:5173/home`: HTTP 200.
- `Invoke-WebRequest http://localhost:5173/api/posts`: HTTP 200.
- `Invoke-WebRequest http://localhost:8080/login`: HTTP 200.

## Pitfalls And Follow-Ups

- The current frontend still uses one large `HomePage.tsx`; extract `Sidebar`, `Topbar`, `StatCard`, `PostList`, `PostDetail`, and `CommentPanel` when the next feature increases complexity.
- Browser plugin verification was unavailable in this environment because the Node runtime is below the plugin requirement.
- The RAG card is a readiness/status placeholder. Real indexing status should come from an API once RAG jobs are implemented.

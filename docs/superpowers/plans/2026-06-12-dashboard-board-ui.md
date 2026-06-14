# Dashboard Board UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the board page into a monochrome dashboard workspace that follows the visual direction of `img.png`.

**Architecture:** Keep the existing `/home` route and board API client. Replace the current Ionic-toolbar page composition with a dashboard shell inside `HomePage.tsx`, then restyle it in `HomePage.css` and theme tokens. Backend login already redirects to the frontend board URL through `app.frontend.board-url`.

**Tech Stack:** React 18, TypeScript, Ionic React controls, Vite, Spring Security, CSS Grid/Flexbox.

---

### Task 1: Dashboard Page Markup

**Files:**
- Modify: `front/src/pages/HomePage.tsx`

- [x] **Step 1: Keep existing board state and data flow**

Use the existing state, API calls, submit handlers, and tag/search behavior. Do not change the request paths:

```ts
fetchPosts({ query, tag });
fetchTags();
fetchPost(id);
createPost(payload);
updatePost(editingPostId, payload);
createComment(selectedPost.id, commentDraft);
```

- [x] **Step 2: Replace the visual shell**

Render this section structure in `HomePage.tsx`:

```tsx
<IonPage>
  <IonContent fullscreen>
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">...</aside>
      <section className="dashboard-main">
        <header className="dashboard-topbar">...</header>
        <section className="dashboard-hero">...</section>
        <section className="dashboard-stats">...</section>
        <section className="dashboard-workspace">...</section>
      </section>
    </main>
  </IonContent>
</IonPage>
```

- [x] **Step 3: Add derived dashboard metrics**

Add memoized values in `HomePage.tsx`:

```ts
const totalComments = useMemo(
  () => posts.reduce((sum, post) => sum + post.commentCount, 0),
  [posts],
);

const updatedAtLabel = selectedPost
  ? formatDate(selectedPost.updatedAt)
  : "No post selected";
```

- [x] **Step 4: Preserve write protection**

Unauthenticated users can search and read posts. Create, update, delete, and comment actions continue to open the backend login URL through `getBackendLoginUrl()`.

### Task 2: Dashboard Styling

**Files:**
- Modify: `front/src/pages/HomePage.css`
- Modify: `front/src/theme/variables.css`

- [x] **Step 1: Replace current color palette**

Use quiet dashboard tokens:

```css
:root {
  --ion-color-primary: #111111;
  --ion-color-secondary: #4b5563;
  --ion-background-color: #f7f7f5;
  --ion-text-color: #111111;
  --ion-card-background: #ffffff;
}
```

- [x] **Step 2: Implement shell layout**

Use a fixed-width sidebar and flexible content:

```css
.dashboard-shell {
  min-height: 100%;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  background: #f7f7f5;
}
```

- [x] **Step 3: Match `img.png` card language**

Cards use thin borders, white backgrounds, 8px radius, and compact spacing:

```css
.dashboard-card {
  border: 1px solid #dedede;
  border-radius: 8px;
  background: #ffffff;
}
```

- [x] **Step 4: Add responsive behavior**

At `max-width: 900px`, collapse to one column and turn the sidebar into a horizontal compact header section.

### Task 3: Documentation And Verification

**Files:**
- Create: `study/dashboard-board-ui.md`
- Modify: `docs/concepts/README.md`
- Modify: `docs/README.md`

- [x] **Step 1: Add a study note**

Document how the `img.png` design translates into frontend layout:

```md
# Dashboard Board UI

## Core Pattern

- Sidebar for navigation.
- Topbar for search and session actions.
- Cards for dense operational sections.
- Thin borders and monochrome hierarchy.
```

- [x] **Step 2: Run frontend verification**

Run:

```powershell
cd front
npm run lint
npm run build
```

Expected: both commands exit 0. Vite may emit a chunk-size warning; that warning is acceptable.

- [x] **Step 3: Run backend regression tests**

Run:

```powershell
cd backend
mvn test
```

Expected: all backend tests pass, including login redirect and board API tests.

- [x] **Step 4: Verify local routes**

Check:

```text
http://localhost:5173/home
http://localhost:5173/api/posts
http://localhost:8080/login
```

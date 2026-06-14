# Browser Synced Theme

## Where It Appears

- `front/src/theme/ThemeProvider.tsx`
- `front/src/theme/ThemeControl.tsx`
- `front/src/theme/variables.css`
- `front/src/pages/HomePage.tsx`
- `front/src/pages/MyPage.tsx`

## What Was Applied

- The frontend has a shared `system | light | dark` theme mode.
- `system` resolves through `prefers-color-scheme`; explicit `light` or `dark` overrides the browser setting.
- The selected mode is stored in `localStorage` under `jungle-ai-theme`.
- The provider writes `data-theme` and `data-theme-mode` on `<html>`.
- Page styles use app-level CSS tokens such as `--app-bg`, `--app-surface`, `--app-text`, `--app-muted`, `--app-border`, and `--app-accent`.

## Why It Matters

- The dashboard can now follow the browser color setting by default while still allowing a user-selected white background.
- `/home`, Agent Workbench, and `/mypage` share the same theme state and visual tokens.
- Keeping the theme in frontend-only state avoids backend/session coupling for a display preference.

## Verification

- `npm.cmd run lint`: verifies the React/TypeScript style rules.
- `npm.cmd run build`: verifies TypeScript and Vite production bundling.
- Manual observation: run the frontend dev server, open `/home`, switch `시스템`, `라이트`, and `다크`, then refresh and confirm the chosen mode remains.

## Pitfalls And Follow-Ups

- Do not add new hardcoded dark-only colors in page CSS; add or reuse a token in `variables.css`.
- `system` should keep responding to browser color changes, while explicit modes should not.
- A later version can add reduced-motion or high-contrast tokens if accessibility needs grow.

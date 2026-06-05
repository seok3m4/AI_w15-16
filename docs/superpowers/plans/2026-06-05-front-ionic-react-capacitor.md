# Front Ionic React Capacitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `front` React, TypeScript, and Vite app configured for future mobile expansion with Ionic React and Capacitor.

**Architecture:** `front` is a single Vite app. Ionic React owns the app shell, routing, and initial mobile-friendly page. Capacitor is configured with Vite's `dist` output as the native app web directory.

**Tech Stack:** React, TypeScript, Vite, Ionic React, Capacitor, ESLint.

---

## File Structure

- Create `front/package.json`: npm scripts and dependency declarations.
- Create `front/index.html`: Vite HTML entry point.
- Create `front/vite.config.ts`: Vite React configuration.
- Create `front/tsconfig.json`, `front/tsconfig.app.json`, `front/tsconfig.node.json`: TypeScript project settings.
- Create `front/eslint.config.js`: flat ESLint configuration for TypeScript and React code.
- Create `front/capacitor.config.ts`: Capacitor configuration using `dist`.
- Create `front/src/main.tsx`: React render entry point.
- Create `front/src/app/App.tsx`: Ionic app shell and router.
- Create `front/src/pages/HomePage.tsx`: initial Ionic page.
- Create `front/src/theme/variables.css`: Ionic theme variables.
- Create `front/src/vite-env.d.ts`: Vite type declarations.
- Create `front/.gitignore`: frontend-specific generated files to ignore.

### Task 1: Scaffold Project Files

**Files:**
- Create: `front/package.json`
- Create: `front/index.html`
- Create: `front/.gitignore`

- [ ] **Step 1: Create npm manifest**

Create `front/package.json` with scripts for Vite, linting, and Capacitor sync/copy.

- [ ] **Step 2: Create Vite HTML entry**

Create `front/index.html` with a root element using `src/main.tsx`.

- [ ] **Step 3: Create frontend ignore file**

Create `front/.gitignore` excluding `node_modules`, `dist`, Capacitor generated platform folders, logs, and local env files.

### Task 2: Add TypeScript, Vite, ESLint, and Capacitor Config

**Files:**
- Create: `front/vite.config.ts`
- Create: `front/tsconfig.json`
- Create: `front/tsconfig.app.json`
- Create: `front/tsconfig.node.json`
- Create: `front/eslint.config.js`
- Create: `front/capacitor.config.ts`

- [ ] **Step 1: Create Vite config**

Configure `@vitejs/plugin-react`.

- [ ] **Step 2: Create TypeScript configs**

Use project references for app and Node config files. Enable strict TypeScript checking and React JSX.

- [ ] **Step 3: Create ESLint config**

Use `@eslint/js` and `typescript-eslint`, ignoring build output.

- [ ] **Step 4: Create Capacitor config**

Set `appId`, `appName`, and `webDir: "dist"`.

### Task 3: Add Ionic React App Shell

**Files:**
- Create: `front/src/main.tsx`
- Create: `front/src/app/App.tsx`
- Create: `front/src/pages/HomePage.tsx`
- Create: `front/src/theme/variables.css`
- Create: `front/src/vite-env.d.ts`

- [ ] **Step 1: Create React entry point**

Render `<App />` inside `React.StrictMode`.

- [ ] **Step 2: Create Ionic app shell**

Use `setupIonicReact`, `IonApp`, `IonReactRouter`, `IonRouterOutlet`, and a redirect from `/` to `/home`.

- [ ] **Step 3: Create initial home page**

Use Ionic page primitives to show that the app is ready for web and mobile expansion.

- [ ] **Step 4: Create theme and Vite declarations**

Add Ionic theme variables and Vite client types.

### Task 4: Install and Verify

**Files:**
- Modify: `front/package-lock.json`

- [ ] **Step 1: Install dependencies**

Run: `npm.cmd install`
Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 2: Run lint**

Run: `npm.cmd run lint`
Expected: ESLint exits with code 0.

- [ ] **Step 3: Run build**

Run: `npm.cmd run build`
Expected: TypeScript and Vite build complete successfully and `front/dist` is created.

- [ ] **Step 4: Start dev server**

Run: `npm.cmd run dev -- --host 127.0.0.1`
Expected: Vite serves the Ionic React app locally.

## Self-Review

- Spec coverage: All design requirements map to scaffold, config, Ionic app shell, Capacitor setup, and validation tasks.
- Placeholder scan: No placeholder steps remain.
- Type consistency: Paths and script names are consistent with the planned project files.

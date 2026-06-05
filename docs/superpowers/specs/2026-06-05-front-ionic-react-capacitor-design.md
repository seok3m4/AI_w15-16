# Front Ionic React Capacitor Design

## Context

The workspace is currently minimal. There is no existing `front` directory and no git repository at the project root. The frontend will be created from scratch under `front`.

## Goal

Set up a React, TypeScript, and Vite frontend that can later expand into a mobile app. The selected approach is Ionic React with Capacitor.

## Architecture

The `front` directory will contain a single Vite React TypeScript app. Ionic React will provide the app shell, mobile-friendly UI primitives, and router integration. Capacitor will be configured as the native wrapper layer for future Android and iOS projects.

Initial structure:

```text
front/
  src/
    app/
    pages/
    shared/
    assets/
  capacitor.config.ts
  vite.config.ts
  tsconfig*.json
```

`src/app` owns app-level providers and routing. `src/pages` owns screen-level components. `src/shared` is reserved for reusable UI, hooks, and utilities. `src/assets` stores local static assets.

## Dependencies

Runtime dependencies:

- `@ionic/react`
- `@ionic/react-router`
- `@capacitor/core`
- `ionicons`
- `react`
- `react-dom`
- `react-router-dom`

Development dependencies:

- `@vitejs/plugin-react`
- `vite`
- `typescript`
- `@capacitor/cli`
- `eslint`
- `typescript-eslint`
- `@eslint/js`

## Scripts

The project will include these baseline scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "cap:sync": "cap sync",
  "cap:copy": "cap copy"
}
```

## Mobile Expansion

Capacitor will be configured with `webDir: "dist"` so the native shell can use Vite build output. Android and iOS project folders will not be generated during this initial setup. They can be added later with Capacitor commands once the local SDK environment is ready.

## Initial UI

The initial app will include a minimal Ionic page using `IonApp`, `IonReactRouter`, `IonRouterOutlet`, `IonPage`, `IonHeader`, `IonToolbar`, `IonTitle`, and `IonContent`. This keeps the app immediately runnable while confirming Ionic routing and styling are wired correctly.

## Validation

Validation will consist of:

- Install dependencies.
- Run `npm run lint`.
- Run `npm run build`.
- Start the Vite dev server and verify the app loads locally.

## Scope

This setup does not include backend integration, authentication, production deployment, Android/iOS native folder generation, or application-specific feature screens.

# Frontend I18n Provider

## Where It Appears

- `front/src/i18n/i18n.ts`
- `front/src/i18n/I18nProvider.tsx`
- `front/src/i18n/LanguageControl.tsx`
- `front/src/app/App.tsx`
- `front/src/pages/HomePage.tsx`
- `front/src/pages/MyPage.tsx`
- `front/src/pages/AgentWorkbench.tsx`
- `front/src/theme/ThemeControl.tsx`
- `front/src/theme/variables.css`

## What Was Applied

- A lightweight React context provides app-wide locale state without adding a new dependency.
- Supported locales are Korean, English, Simplified Chinese, Traditional Chinese, and Japanese.
- The selected locale is stored in `localStorage` with the `jungle-ai-locale` key and reflected on `<html lang="...">`.
- Static UI labels, buttons, placeholders, aria labels, loading states, and empty states read from typed translation keys.
- Date/time display uses `Intl.DateTimeFormat(locale, ...)` so visible timestamps follow the selected language.

## Why It Matters

- The dashboard is an educational product, so the frame around the data must be understandable in the user's preferred language.
- Keeping the dictionary in frontend code is enough for v1 because this change only translates static UI chrome.
- API-provided metric names, RAG snippets, and AI-generated summaries remain server/dataset content. They are not auto-translated in this layer, which avoids silently changing sourced evidence.

## Verification

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed. Vite emitted the existing large chunk warning.

## Pitfalls And Follow-Ups

- Translation keys should stay aligned across all locale objects. `tsc -b` catches many missing-key mistakes because `translate(locale, key)` reads from the locale union.
- Dynamic backend content needs a separate API contract if it should be localized later.
- Agent catalog names currently come from the server and remain dynamic content. A future version can return localized catalog labels or stable agent IDs with frontend translations.

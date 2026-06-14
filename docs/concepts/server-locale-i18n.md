# Server Locale I18n

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/i18n/SupportedLocale.java`
- `backend/src/main/java/com/junglecamp/backend/i18n/LocaleResolver.java`
- `backend/src/main/java/com/junglecamp/backend/economy/EconomyTextCatalog.java`
- `backend/src/main/java/com/junglecamp/backend/agent/AgentService.java`
- `agent-worker/app/schemas.py`
- `agent-worker/app/service.py`
- `front/src/api/economy.ts`
- `front/src/api/agents.ts`
- `front/src/theme/DisplaySettingsControl.tsx`

## What Was Applied

- The frontend keeps local UI labels in its i18n dictionary, but dynamic economy and Agent content is requested from the server with a locale.
- Supported locales are `ko`, `en`, `zh-Hans`, `zh-Hant`, and `ja`; unknown values fall back to `ko`.
- Economy dashboard responses localize metric labels, categories, units, interpretations, market signals, Korea impacts, reports, fallback briefs, and trace text while preserving metric ids, numbers, dates, and source URLs.
- Agent summary, catalog, chat, and run history APIs accept locale and store/read runs per user and locale.
- The Python worker receives locale in briefing/chat requests and includes the target language in Agent instructions and fallback responses.
- The topbar uses one compact display settings popover that contains language and theme controls.

## Why It Matters

- Numeric evidence should remain server verified and stable, while explanatory text follows the user's selected language.
- Locale-specific Agent runs prevent a Korean summary and an English summary from overwriting or reusing each other accidentally.
- The compact settings control keeps the topbar usable after adding both theme and language selection.

## Verification

- `python -m pytest`: 18 passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, with an existing large chunk warning from Vite.
- `mvn.cmd test`: 49 passed after allowing Maven dependency resolution.

## Pitfalls And Follow-Ups

- RAG/news source text is not translated at ingestion time; Agent answers explain in the selected language while preserving original source URLs.
- OpenAI economy brief sync now has locale-aware storage, so production should monitor brief generation volume by locale.
- If future custom Agents are added, their prompt templates should use the same server locale resolver and fallback strategy.

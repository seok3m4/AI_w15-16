# US Economy AI Dashboard Contract

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/economy/controller/UsEconomyDashboardController.java`
- `backend/src/main/java/com/junglecamp/backend/economy/`
- `backend/src/main/resources/db/migration/V2__create_economy_cache_schema.sql`
- `backend/src/main/resources/db/migration/V14__create_economy_exchange_rates.sql`
- `backend/src/main/resources/application.properties`
- `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`
- `backend/src/test/java/com/junglecamp/backend/economy/service/EconomySyncServiceTests.java`
- `backend/src/test/java/com/junglecamp/backend/economy/service/EconomyDashboardServiceTests.java`
- `backend/src/test/java/com/junglecamp/backend/economy/FredObservationMapperTests.java`
- `backend/src/test/java/com/junglecamp/backend/economy/KoreaEximExchangeClientTests.java`
- `front/src/features/economy/api/economy.ts`
- `front/src/features/economy/pages/HomePage.tsx`
- `front/src/features/economy/pages/HomePage.css`

## What Was Applied

- The dashboard data path moved from hardcoded sample objects to a server-side cache.
- `FredSeriesClient` fetches official FRED observations for the first metric set.
- `FredObservationMapper` calculates latest value, previous value, change, percent change, base date, unit, and source URL.
- `EconomySyncService` runs scheduled sync once per configured interval. The dashboard read path does not start economy sync.
- `EconomySnapshotRepository` reads and writes PostgreSQL/Flyway cache tables with `JdbcTemplate`.
- `OpenAiBriefService` uses OpenAI only for narrative generation, never for creating metric numbers.
- Each economy sync sends one OpenAI brief request per supported locale and stores only `generationStatus = 'generated'` responses.
- If OpenAI is missing or fails, `RuleBasedBriefFactory` returns a safe in-memory fallback with `generationStatus`; fallback briefs are not persisted to `economy_briefs`.
- The frontend now calls `fetchEconomyDashboard()` instead of importing a static `economyDashboard` object.
- Korea Eximbank exchange rates are cached separately from FRED metrics and returned as `exchangeRates` for country/currency selection in the home UI.
- All non-empty currencies returned by Korea Eximbank are stored. The repository sorts common currencies first (`USD`, `JPY`, `EUR`, `CNY`) and then falls back to currency-code order.

## Why It Matters

- The product goal is for a user to understand the US economy state quickly from source-backed metrics.
- API keys stay on the backend; the frontend only reads `/api/us-economy/dashboard`.
- Every metric carries unit, base date, source name, source URL, previous value, and change so AI output can be tied back to evidence.
- The cache-first design keeps the dashboard responsive even when FRED or OpenAI is unavailable.
- Keeping OpenAI generation out of the dashboard request path prevents home reloads from creating new Responses records.

## API Contract

- `GET /api/us-economy/dashboard`
- Public anonymous read.
- Top-level fields:
  - `brief`
- `metrics`
- `exchangeRates`
- `events`
  - `marketSignals`
  - `koreaImpacts`
  - `reports`
  - `agentTrace`

`brief` includes:

- `summary`
- `statusLabel`
- `evidenceMetricIds`
- `evidenceEventIds`
- `koreaImpact`
- `risks`
- `generatedAt`
- `generationStatus`

Each metric includes:

- `id`
- `name`
- `category`
- `value`
- `unit`
- `period`
- `baseDate`
- `sourceName`
- `sourceUrl`
- `previousValue`
- `change`
- `changePercent`
- `interpretation`
- `updatedAt`

Each exchange rate includes:

- `currencyCode`
- `currencyName`
- `baseDate`
- `dealBaseRate`
- `ttb`
- `tts`
- `sourceName`
- `sourceUrl`
- `updatedAt`

## Backend Sync

- Configure with:
  - `FRED_API_KEY`
  - `KOREAEXIM_API_KEY`
  - `OPENAI_API_KEY`
  - `OPENAI_BRIEF_MODEL`, default `gpt-5.5`
  - `ECON_SYNC_FIXED_RATE_MS`, default `14400000`
  - `ECON_STALE_AFTER_MINUTES`, default `240`
  - `ECON_SYNC_DAILY_LIMIT`, default `20`
  - `ECON_SYNC_ENABLED`, default `true`
  - `KOREAEXIM_EXCHANGE_FIXED_RATE_MS`, default `300000`
  - `KOREAEXIM_EXCHANGE_STALE_AFTER_MINUTES`, default `55`
  - `KOREAEXIM_EXCHANGE_BUSINESS_DAY_CRON`, default `0 10 11 * * MON-FRI`
- FRED metrics currently mapped:
  - `CPIAUCSL`, `CPILFESL`, `PCEPI`
  - `UNRATE`, `PAYEMS`
  - `RSAFS`, `A191RL1Q225SBEA`
  - `DGS10`, `DGS2`
  - `DEXKOUS`, `SP500`, `DCOILWTICO`
- Sync failures are recorded in `economy_sync_runs`; existing cache remains readable.
- Server startup does not trigger economy sync. Sync runs from the scheduler or the admin manual sync action.
- Dashboard reads return cached metrics and cached briefs only; they no longer call `EconomySyncService.refreshIfStale()`.
- OpenAI success stores generated briefs for all supported locales in `economy_briefs`. Each locale is generated directly by OpenAI, rather than being derived from an English template. Missing or failed OpenAI does not persist fallback briefs; `/api/us-economy/dashboard` uses an in-memory rule-based fallback only when no generated brief exists.
- Economy sync runs every four hours by default and checks a Korea-time daily cap before making FRED/OpenAI calls. When `ECON_SYNC_DAILY_LIMIT=20` is reached, the service records a skipped `FRED` sync run with `daily_limit_reached`.
- Dashboard brief lookup prefers the latest `generationStatus = 'generated'` row for the requested locale before considering fallback rows. This prevents newer `fallback:openai-error` history from masking the latest real generated brief.
- Korea Eximbank exchange sync calls `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON` with `data=AP01`, every five minutes by default. This is about 288 calls per day, leaving room under the 1,000/day API limit even with the 11:10 KST business-day catch-up sync. Before 11:00 KST on business days it starts from the previous business day; after 11:00 KST it tries today first and falls back up to seven days when the API has not posted data yet.
- The five-minute policy stays below the 1,000 requests/day API limit while still retrying after the expected 11:00 KST update window.

## Frontend Path

- `front/src/features/economy/api/economy.ts` defines the shared TypeScript contract and `fetchEconomyDashboard()`.
- `front/src/features/economy/pages/HomePage.tsx` loads the dashboard in `useEffect`.
- The page renders loading, error, last-updated, and `brief.generationStatus` states.
- The dashboard sections render in this order:
  - AI brief and evidence metric links
  - Korea Eximbank official exchange-rate selector
  - Core metric strip
  - Economic calendar log
  - Market signal summary
  - Korea impact axes
  - US economy reports
  - Agent trace and guardrail results
- The exchange-rate selector uses a compact master-detail pattern: currency chips become a horizontal selector, while the selected currency's deal-base, buy, sell, source, and base-date details are compressed into one dashboard card. This is an information-density optimization for dashboard UI.
- The exchange-rate card displays a short source caveat: Korea Eximbank rates are official daily reference rates and can differ from each bank's live quote, cash, and remittance rates.

## Run Commands

- Backend tests: `cd backend; mvn test`
- Frontend lint: `cd front; npm.cmd run lint`
- Frontend build: `cd front; npm.cmd run build`
- Backend smoke: `Invoke-WebRequest http://localhost:8080/api/us-economy/dashboard -UseBasicParsing`
- Frontend smoke: `Invoke-WebRequest http://127.0.0.1:5173/home -UseBasicParsing`

## Verification

- `mvn test`: passed with 15 tests, 0 failures, 0 errors, 0 skipped.
- `mvn "-Dtest=ApiIntegrationTests#includesKoreaEximExchangeRatesForCurrencySelection,KoreaEximExchangeClientTests" test`: passed with 4 tests, 0 failures, 0 errors.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed; Vite reported the existing large chunk warning.
- `npm.cmd run lint`: passed after the compact exchange-rate selector update.
- `npm.cmd run build`: passed after the compact exchange-rate selector update; Vite reported the existing large chunk warning.
- `Invoke-WebRequest http://localhost:8080/api/us-economy/dashboard`: returned `200 OK` with `generationStatus` fallback when no OpenAI key was available.
- `Invoke-WebRequest http://127.0.0.1:5173/home`: returned `200 OK` from the local Vite server.
- Browser plugin visual inspection could not run because the installed Browser plugin is missing `scripts/browser-client.mjs`.
- `mvn.cmd "-Dtest=EconomySyncServiceTests,EconomyDashboardServiceTests" test`: passed with 3 tests after the one-call OpenAI sync, locale save, hourly schedule, no-startup-sync, and cache-only dashboard behavior were implemented.
- `mvn.cmd test`: passed with 79 tests after the economy sync policy update.
- `mvn.cmd "-Dtest=OpenAiBriefServiceTests,EconomySyncServiceTests" test`: passed with 5 tests after OpenAI response parsing, 4-hour schedule, per-locale OpenAI generation, fallback non-persistence, and daily sync cap changes were verified.
- `mvn.cmd "-Dtest=ManualEconomySyncOnceTest#runsEconomySyncOnceAndPrintsLatestGeneratedBriefs" test`: passed during manual verification before the temporary test file was removed. It executed one real FRED/OpenAI sync and stored generated `economy_briefs` rows for `ko`, `en`, `zh-Hans`, `zh-Hant`, and `ja` using `gpt-5.5`; the latest Korean generated row was saved at `2026-06-15 18:17:32`.
- `mvn.cmd clean test`: failed outside this change because Surefire could not create `com.junglecamp.backend.agent.HttpAgentWorkerClientTests` (`ClassNotFoundException`). The focused economy/OpenAI tests were rerun after clean and passed.
- `mvn.cmd "-Dtest=OpenAiBriefServiceTests,EconomySyncServiceTests,EconomyDashboardServiceTests" test`: passed with 7 tests after the full-suite scan failure.
- `mvn.cmd -Dtest=ApiIntegrationTests#readsLatestGeneratedEconomyBriefBeforeNewerFallbackError test`: passed after dashboard lookup was changed to prefer stored generated briefs over newer fallback errors.
- `mvn.cmd -Dtest=ApiIntegrationTests#readsUsEconomyDashboardFromStoredSnapshotsWithJdbcSeedAndFallsBackWithoutOpenAi test`: passed after confirming initial fallback behavior still works when no generated brief exists.

## Pitfalls And Follow-Ups

- Without `FRED_API_KEY`, sync records a failure and the dashboard returns an empty metric list with fallback brief.
- `OPENAI_API_KEY` is optional for server health, but required for generated AI briefs.
- Non-English cached briefs require successful locale-specific OpenAI generation. If one locale fails, its fallback is skipped instead of being saved as stale-looking generated content.
- BLS and BEA are not wired yet; this version uses FRED as the first official/free data hub.
- `economy_events` exists in the cache schema, but release-calendar sync is a follow-up.
- Frontend must not import sample dashboard constants; `fetchEconomyDashboard()` is the contract boundary.
- Korea Eximbank exchange rates are official daily reference rates, not tick-level live FX quotes. Weekend and holiday handling depends on fallback to the latest available business day.

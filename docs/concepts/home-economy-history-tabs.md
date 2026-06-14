# Home Economy Tabs And History Cache

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/controller/UsEconomyDashboardController.java`
- `backend/src/main/java/com/junglecamp/backend/economy/EconomySupplementService.java`
- `front/src/pages/HomePage.tsx`

## What Was Applied

- `/home` now uses separate workspaces for Home, Discussion, Economic Events, Reports, Watchlist, and Agent.
- Home focuses on the AI brief and core metric cards. Economic events, reports, and watch metrics are rendered in their own tabs.
- Metric cards fetch `GET /api/us-economy/metrics/{metricId}/history?range=1y|3y|5y` when expanded.
- Metric history responses now include `dataSources`, `assetImpact`, and `relatedEvents` so the expanded card can explain where the data came from and how the indicator is usually read across stocks, bonds, gold, and the dollar.
- `GET /api/us-economy/data-sources` exposes the home data-source catalog for FRED, BLS, BEA, Alpha Vantage, EIA, CFTC COT, SEC EDGAR, and GDELT.
- `GET /api/us-economy/market-indicators?group=...` exposes free official/proxy market indicators. Values come from the verified cache when available; missing mappings or keys are represented with status values instead of failing the page.
- `GET /api/us-economy/calendar` is an alias for the authenticated economic events feed, while `/events` now supports `category` and `relatedMetricId` filters.
- FRED observations are cached in `economy_metric_observations`; BLS, BEA, and Alpha Vantage comparison values are cached in `economy_metric_source_values`.
- Missing provider keys do not stop the app. Comparison rows or responses expose `missing_config` so the UI can show the data gap safely.
- FRED remains the canonical home value. Source comparison rows now separate `rawValue/rawUnit` from `normalizedValue/normalizedUnit` and include `comparisonNote`.
- Provider failures are classified more precisely than generic `failed`: examples include `invalid_key`, `inactive_key`, `rate_limited`, `unsupported_mapping`, and `access_denied`.
- Official free APIs do not provide a reliable consensus forecast feed. Economic events therefore expose `forecastStatus`; empty forecasts are marked as `paid_or_manual_required`.
- When an official/free forecast is unavailable, the supplement service can attach `estimatedForecast` at response time. This is a low-confidence heuristic based on recent cached FRED observation changes, not a consensus estimate.
- `estimatedForecast` is never persisted as official event data. It is calculated for `/api/us-economy/events`, `/api/us-economy/calendar`, and metric history `relatedEvents` so the UI can show a rough learning estimate while preserving the official/estimated boundary.

## Why It Matters

- The home screen stays scan-friendly while deeper history is available on demand.
- The expanded card teaches the data chain without turning the home screen into a full research terminal.
- API keys remain server-side, and the browser only reads verified cache/API responses.
- Source comparisons are treated as secondary evidence, while FRED remains the primary dashboard baseline.
- Same-date values can differ because the series transformation can differ. For example, FRED CPI can be requested as `CPIAUCSL + units=pc1` for `% YoY`, while BLS `CUUR0000SA0` is a raw CPI index level.
- Market indicator endpoints are educational context, not trading signals or investment advice.
- Rough forecast estimates help users learn what a next release might look like, but they must be read as model-free trend extrapolations. They should not be displayed as analyst consensus or used as investment advice.

## Verification

- `mvn.cmd -Dtest=ApiIntegrationTests#onlyHomeDashboardAndMetricHistoryArePublicForAnonymousUsers+returnsMetricHistoryWithCachedFredObservationsAndSourceComparisons+returnsEconomyDataSourcesAndMarketIndicatorsForHomeExpansion+filtersEconomicEventsBySourceImportanceAndDateRange test`: passed.
- `mvn.cmd -Dtest=ApiIntegrationTests#returnsMetricHistoryWithCachedFredObservationsAndSourceComparisons test`: passed.
- `mvn.cmd -Dtest=ApiIntegrationTests#rejectsUnknownMetricHistoryRequests+returnsMissingConfigSourceComparisonWhenProviderKeysAreAbsent+filtersEconomicEventsBySourceImportanceAndDateRange+filtersGeneratedEconomyReportsByMetricAndCategory test`: passed.
- `mvn.cmd test`: passed, 65 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed with the existing Vite large chunk warning.

## Pitfalls And Follow-Ups

- BEA source comparison mapping is complete for GDP v1 but PCE direct BEA table mapping may need refinement.
- Alpha Vantage `SPY_PROXY` is only a proxy comparison for S&P 500; FRED `SP500` remains the baseline value.
- Economic event parsing normalizes public calendars, so provider calendar format changes should be monitored through `economy_sync_runs`.
- BLS invalid keys, BEA inactive UserIds, and Alpha Vantage rate limits are surfaced as status values; they still require key/account fixes outside the code.
- FOMC, EIA, CFTC, SEC, and GDELT are exposed as data-source or market-context providers in v1. Deeper ingestion for those sources should be added incrementally instead of mixed into the canonical FRED metric path.
- `estimatedForecast` currently uses a simple recent-average-change projection. A future version can add a richer nowcast model, but it should keep a separate field and confidence label unless a licensed consensus feed is added.

export interface AiBrief {
  summary: string;
  statusLabel: string;
  evidenceMetricIds: string[];
  evidenceEventIds: string[];
  koreaImpact: string;
  risks: string[];
  generatedAt: string;
  generationStatus: string;
}

export interface MetricSnapshot {
  id: string;
  name: string;
  category: string;
  value: string;
  unit: string;
  period: string;
  baseDate: string;
  sourceName: string;
  sourceUrl: string;
  previousValue: string;
  change: string;
  changePercent: string;
  interpretation: string;
  updatedAt: string;
}

export interface ExchangeRate {
  currencyCode: string;
  currencyName: string;
  baseDate: string;
  dealBaseRate: string;
  ttb: string;
  tts: string;
  sourceName: string;
  sourceUrl: string;
  updatedAt: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  releaseDateTime: string;
  importance: "high" | "medium" | "low";
  previousValue: string;
  forecastValue: string;
  actualValue: string | null;
  unit: string;
  status: "scheduled" | "released";
  interpretation: string;
  sourceName: string;
  sourceUrl: string;
  relatedMetricIds: string[];
  sourceType?: string;
  sourceEventId?: string;
  eventCategory?: string;
  updatedAt?: string;
  forecastStatus?: "available" | "paid_or_manual_required" | string;
  estimatedForecast?: ForecastEstimate | null;
}

export interface ForecastEstimate {
  value: string;
  unit: string;
  status: "estimated" | string;
  method: string;
  confidence: "low" | "medium" | "high" | string;
  note: string;
}

export interface MarketSignal {
  id: string;
  label: string;
  state: "watch" | "neutral" | "calm";
  value: string;
  interpretation: string;
}

export interface KoreaImpact {
  axis: string;
  state: "watch" | "neutral" | "calm";
  summary: string;
  watchItems: string[];
}

export interface ReportItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  koreaImplication: string;
  relatedMetricIds: string[];
  sourceName: string;
  sourceUrl: string;
}

export interface AgentTraceStep {
  agent: string;
  action: string;
  guardrail: string;
  result: "pass" | "review";
}

export interface EconomyDashboard {
  brief: AiBrief;
  metrics: MetricSnapshot[];
  exchangeRates: ExchangeRate[];
  events: EconomicEvent[];
  marketSignals: MarketSignal[];
  koreaImpacts: KoreaImpact[];
  reports: ReportItem[];
  agentTrace: AgentTraceStep[];
}

export interface MetricObservationPoint {
  date: string;
  value: string;
}

export interface MetricSourceComparison {
  provider: string;
  providerSeriesId: string;
  value: string;
  unit: string;
  rawValue: string;
  rawUnit: string;
  normalizedValue: string;
  normalizedUnit: string;
  comparisonNote: string;
  baseDate: string;
  sourceUrl: string;
  status: "synced" | "missing_config" | "not_synced" | "failed" | string;
  errorMessage: string | null;
  updatedAt: string;
}

export interface DataSourceInfo {
  id: string;
  name: string;
  providerType: string;
  usedFor: string;
  coverage: string;
  updateFrequency: string;
  apiKeyRequired: boolean;
  sourceUrl: string;
  status: string;
}

export interface AssetImpact {
  stocks: string;
  bonds: string;
  gold: string;
  dollar: string;
  note: string;
}

export interface MetricHistoryResponse {
  metric: MetricSnapshot;
  points: MetricObservationPoint[];
  sourceComparisons: MetricSourceComparison[];
  syncStatus: string;
  dataSources: DataSourceInfo[];
  assetImpact: AssetImpact;
  relatedEvents: EconomicEvent[];
}

export interface EconomyEventsResponse {
  items: EconomicEvent[];
}

export interface EconomyReportsResponse {
  items: ReportItem[];
}

export interface DataSourcesResponse {
  items: DataSourceInfo[];
}

export interface MarketIndicator {
  id: string;
  name: string;
  group: "equity" | "rates" | "bonds" | "gold" | "fx" | "energy" | "liquidity" | string;
  value: string;
  unit: string;
  baseDate: string;
  sourceName: string;
  sourceUrl: string;
  change: string;
  status: string;
}

export interface MarketIndicatorsResponse {
  items: MarketIndicator[];
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

function localeQuery(locale?: LocaleCode) {
  return locale ? `?locale=${encodeURIComponent(locale)}` : "";
}

export async function fetchEconomyDashboard(locale?: LocaleCode): Promise<EconomyDashboard> {
  const response = await fetch(`${apiBaseUrl}/api/us-economy/dashboard${localeQuery(locale)}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Economy dashboard request failed: ${response.status}`);
  }

  return response.json() as Promise<EconomyDashboard>;
}

export async function fetchMetricHistory(
  metricId: string,
  range: "1y" | "3y" | "5y",
  locale?: LocaleCode,
): Promise<MetricHistoryResponse> {
  const params = new URLSearchParams({ range });
  if (locale) {
    params.set("locale", locale);
  }
  const response = await fetch(`${apiBaseUrl}/api/us-economy/metrics/${metricId}/history?${params}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Metric history request failed: ${response.status}`);
  }

  return response.json() as Promise<MetricHistoryResponse>;
}

export async function fetchEconomyEvents(locale?: LocaleCode): Promise<EconomyEventsResponse> {
  const response = await fetch(`${apiBaseUrl}/api/us-economy/events${localeQuery(locale)}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Economy events request failed: ${response.status}`);
  }

  return response.json() as Promise<EconomyEventsResponse>;
}

export async function fetchEconomyDataSources(): Promise<DataSourcesResponse> {
  const response = await fetch(`${apiBaseUrl}/api/us-economy/data-sources`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Economy data sources request failed: ${response.status}`);
  }

  return response.json() as Promise<DataSourcesResponse>;
}

export async function fetchMarketIndicators(
  group?: MarketIndicator["group"],
  locale?: LocaleCode,
): Promise<MarketIndicatorsResponse> {
  const params = new URLSearchParams();
  if (group) {
    params.set("group", group);
  }
  if (locale) {
    params.set("locale", locale);
  }
  const query = params.toString();
  const response = await fetch(`${apiBaseUrl}/api/us-economy/market-indicators${query ? `?${query}` : ""}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Market indicators request failed: ${response.status}`);
  }

  return response.json() as Promise<MarketIndicatorsResponse>;
}

export async function fetchEconomyReports(locale?: LocaleCode): Promise<EconomyReportsResponse> {
  const response = await fetch(`${apiBaseUrl}/api/us-economy/reports${localeQuery(locale)}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Economy reports request failed: ${response.status}`);
  }

  return response.json() as Promise<EconomyReportsResponse>;
}
import type { LocaleCode } from "../../../i18n/i18n";

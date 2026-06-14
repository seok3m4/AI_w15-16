import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IonContent, IonIcon, IonPage } from "@ionic/react";
import {
  bookmarkOutline,
  calendarOutline,
  chatbubblesOutline,
  documentTextOutline,
  homeOutline,
  logInOutline,
  logOutOutline,
  notificationsOutline,
  personCircleOutline,
  refreshOutline,
  searchOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
} from "ionicons/icons";

import {
  fetchCurrentUser,
  fetchDashboardPreferences,
  logoutCurrentUser,
  type CurrentUser,
  type DashboardPreferences,
} from "../../../api/backend";
import {
  fetchEconomyDashboard,
  fetchEconomyEvents,
  fetchEconomyReports,
  fetchMetricHistory,
  type EconomicEvent,
  type EconomyDashboard,
  type ExchangeRate,
  type MetricHistoryResponse,
  type MetricObservationPoint,
  type MetricSnapshot,
  type ReportItem,
} from "../api/economy";
import { fetchBoardNotifications } from "../../board/api/posts";
import type { LocaleCode } from "../../../i18n/i18n";
import AgentWorkbench from "../../agents/pages/AgentWorkbench";
import DiscussionBoard from "../../board/pages/DiscussionBoard";
import { useI18n } from "../../../i18n/I18nProvider";
import DisplaySettingsControl from "../../../theme/DisplaySettingsControl";

import "./HomePage.css";

type WorkspaceKey = "home" | "discussion" | "events" | "reports" | "watchlist" | "agent";
type HistoryRange = "1y" | "3y" | "5y";
type Translate = ReturnType<typeof useI18n>["t"];

const navigationItems = [
  { labelKey: "home.nav.home", icon: homeOutline, view: "home" as WorkspaceKey },
  { labelKey: "home.nav.discussion", icon: chatbubblesOutline, view: "discussion" as WorkspaceKey },
  { labelKey: "home.economicEvents", icon: calendarOutline, view: "events" as WorkspaceKey },
  { labelKey: "home.reports", icon: documentTextOutline, view: "reports" as WorkspaceKey },
  { labelKey: "home.watchlist", icon: bookmarkOutline, view: "watchlist" as WorkspaceKey },
  { labelKey: "home.nav.agent", icon: sparklesOutline, view: "agent" as WorkspaceKey },
] as const;

function workspaceRequiresAuth(view: WorkspaceKey) {
  return view !== "home";
}

function formatDateTime(value: string, locale: string, fallback: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sourceLabel(metric: MetricSnapshot) {
  return `${metric.baseDate} · ${metric.sourceName}`;
}

function valueWithUnit(value: string, unit: string) {
  if (!unit) {
    return value;
  }
  return unit.startsWith("%") ? `${value}${unit}` : `${value} ${unit}`;
}

function eventForecastText(event: EconomicEvent) {
  if (event.forecastValue) {
    return valueWithUnit(event.forecastValue, event.unit);
  }
  if (event.estimatedForecast?.value) {
    return `${valueWithUnit(event.estimatedForecast.value, event.estimatedForecast.unit)} (추정)`;
  }
  if (event.forecastStatus === "paid_or_manual_required") {
    return "무료 공식 API 미제공";
  }
  return "--";
}

function filterByPreference<T extends { id: string }>(items: T[], selectedIds?: string[]) {
  if (!selectedIds || selectedIds.length === 0) {
    return items;
  }

  const allowed = new Set(selectedIds);
  return items.filter((item) => allowed.has(item.id));
}

function pickWatchMetrics(metrics: MetricSnapshot[], preferences: DashboardPreferences | null) {
  const preferred = preferences?.watchMetricIds?.length
    ? preferences.watchMetricIds
    : ["usd-krw", "ust10y", "ust2y", "cpi", "retail-sales"];
  const picked = filterByPreference(metrics, preferred);
  return picked.length > 0 ? picked : metrics.slice(0, 5);
}

function parsePointValue(point: MetricObservationPoint) {
  const value = Number(point.value.replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function MetricLineChart({ points }: { points: MetricObservationPoint[] }) {
  const numericPoints = points
    .map((point) => ({ ...point, numericValue: parsePointValue(point) }))
    .filter((point): point is MetricObservationPoint & { numericValue: number } => point.numericValue !== null);

  if (numericPoints.length < 2) {
    return <p className="econ-empty">Not enough history points to draw a chart.</p>;
  }

  const values = numericPoints.map((point) => point.numericValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 640;
  const height = 220;
  const padding = 28;
  const coordinates = numericPoints.map((point, index) => {
    const x = padding + (index / (numericPoints.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.numericValue - min) / span) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const first = numericPoints[0];
  const last = numericPoints[numericPoints.length - 1];

  return (
    <div className="econ-chart" aria-label="Metric history chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <line className="econ-chart__axis" x1={padding} x2={padding} y1={padding} y2={height - padding} />
        <line className="econ-chart__axis" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        <polyline className="econ-chart__line" fill="none" points={coordinates.join(" ")} />
        {numericPoints.map((point, index) => {
          const [x, y] = coordinates[index].split(",");
          return <circle className="econ-chart__dot" cx={x} cy={y} key={`${point.date}-${point.value}`} r="3.5" />;
        })}
      </svg>
      <div className="econ-chart__legend">
        <span>{first.date}: {first.value}</span>
        <strong>{last.date}: {last.value}</strong>
      </div>
    </div>
  );
}

function MetricHistoryPanel({
  history,
  isLoading,
  errorMessage,
  range,
  onRangeChange,
  locale,
  t,
}: {
  history: MetricHistoryResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  range: HistoryRange;
  onRangeChange: (range: HistoryRange) => void;
  locale: string;
  t: Translate;
}) {
  return (
    <div className="econ-history-panel">
      <div className="econ-history-panel__header">
        <div>
          <strong>{t("home.historyTitle")}</strong>
          <span>{history?.syncStatus ?? t("home.syncWaiting")}</span>
        </div>
        <div className="econ-range-control" aria-label={t("home.historyRange")}>
          {(["1y", "3y", "5y"] as const).map((item) => (
            <button
              className={item === range ? "is-active" : ""}
              key={item}
              type="button"
              onClick={() => onRangeChange(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="econ-empty">{t("home.historyLoading")}</p>}
      {errorMessage && <p className="econ-empty">{errorMessage}</p>}
      {!isLoading && !errorMessage && history && (
        <>
          <MetricLineChart points={history.points} />
          {history.assetImpact && (
            <div className="econ-asset-impact">
              <strong>자산 영향 읽기</strong>
              <dl>
                <div>
                  <dt>주식</dt>
                  <dd>{history.assetImpact.stocks}</dd>
                </div>
                <div>
                  <dt>채권</dt>
                  <dd>{history.assetImpact.bonds}</dd>
                </div>
                <div>
                  <dt>금</dt>
                  <dd>{history.assetImpact.gold}</dd>
                </div>
                <div>
                  <dt>달러</dt>
                  <dd>{history.assetImpact.dollar}</dd>
                </div>
              </dl>
              <p>{history.assetImpact.note}</p>
            </div>
          )}
          {(history.dataSources?.length ?? 0) > 0 && (
            <div className="econ-data-sources">
              <strong>수집 원천</strong>
              <div className="econ-data-sources__list">
                {(history.dataSources ?? []).map((source) => (
                  <a href={source.sourceUrl} key={source.id} rel="noreferrer" target="_blank">
                    <span>{source.name}</span>
                    <strong>{source.status}</strong>
                    <small>{source.usedFor}</small>
                    <small>
                      {source.coverage} / {source.updateFrequency}
                    </small>
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="econ-source-comparison">
            <strong>{t("home.sourceComparison")}</strong>
            {history.sourceComparisons.length === 0 ? (
              <p className="econ-empty">{t("home.sourceComparisonEmpty")}</p>
            ) : (
              <div className="econ-source-comparison__list">
                {history.sourceComparisons.map((item) => (
                  <a href={item.sourceUrl} key={`${item.provider}-${item.providerSeriesId}`} rel="noreferrer" target="_blank">
                    <span>{item.provider}</span>
                    <strong>{item.value || item.status}</strong>
                    <small>
                      {item.providerSeriesId}
                      {item.baseDate ? ` · ${item.baseDate}` : ""}
                    </small>
                    {item.rawValue && (
                      <small>
                        raw: {item.rawValue} {item.rawUnit}
                      </small>
                    )}
                    {item.normalizedValue && (
                      <small>
                        normalized: {item.normalizedValue} {item.normalizedUnit}
                      </small>
                    )}
                    {item.comparisonNote && <em>{item.comparisonNote}</em>}
                    {item.errorMessage && <em>{item.errorMessage}</em>}
                  </a>
                ))}
              </div>
            )}
          </div>
          {(history.relatedEvents?.length ?? 0) > 0 && (
            <div className="econ-related-events">
              <strong>관련 다음 발표</strong>
              <div className="econ-related-events__list">
                {(history.relatedEvents ?? []).map((event) => (
                  <a href={event.sourceUrl} key={event.id} rel="noreferrer" target="_blank">
                    <span>{formatDateTime(event.releaseDateTime, locale, "일정 대기")}</span>
                    <strong>{event.title}</strong>
                    <small>
                      예상: {eventForecastText(event)} / 실제: {event.actualValue ?? t("home.pendingActual")}
                    </small>
                    {event.estimatedForecast?.note && <em>{event.estimatedForecast.note}</em>}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExchangeRatePanel({
  rates,
  selectedCurrencyCode,
  onSelectCurrency,
  locale,
  t,
}: {
  rates: ExchangeRate[];
  selectedCurrencyCode: string;
  onSelectCurrency: (currencyCode: string) => void;
  locale: string;
  t: Translate;
}) {
  const selectedRate = rates.find((rate) => rate.currencyCode === selectedCurrencyCode) ?? rates[0] ?? null;

  return (
    <section className="econ-exchange-panel" aria-label={t("home.exchangeRatesTitle")}>
      <div className="econ-section-title">
        <strong>{t("home.exchangeRatesTitle")}</strong>
        <span>{t("home.exchangeRatesSubtitle")}</span>
      </div>
      {rates.length === 0 || !selectedRate ? (
        <p className="econ-empty">{t("home.exchangeRatesEmpty")}</p>
      ) : (
        <div className="econ-exchange-panel__body">
          <div className="econ-exchange-selector" role="tablist" aria-label={t("home.exchangeRateCurrency")}>
            {rates.map((rate) => (
              <button
                aria-selected={rate.currencyCode === selectedRate.currencyCode}
                className={rate.currencyCode === selectedRate.currencyCode ? "is-active" : ""}
                key={rate.currencyCode}
                type="button"
                onClick={() => onSelectCurrency(rate.currencyCode)}
              >
                {rate.currencyCode}
              </button>
            ))}
          </div>
          <article className="econ-exchange-rate">
            <div>
              <span>{selectedRate.currencyName}</span>
              <h2>{selectedRate.currencyCode}/KRW</h2>
            </div>
            <strong>
              {selectedRate.dealBaseRate}
              <small>KRW</small>
            </strong>
            <dl>
              <div>
                <dt>{t("home.exchangeRateTtb")}</dt>
                <dd>{selectedRate.ttb || "--"}</dd>
              </div>
              <div>
                <dt>{t("home.exchangeRateTts")}</dt>
                <dd>{selectedRate.tts || "--"}</dd>
              </div>
            </dl>
            <footer>
              <span>{t("home.exchangeRateBaseDate")}: {selectedRate.baseDate}</span>
              <a href={selectedRate.sourceUrl} rel="noreferrer" target="_blank">
                {selectedRate.sourceName} · {formatDateTime(selectedRate.updatedAt, locale, t("home.syncWaiting"))}
              </a>
            </footer>
            <p className="econ-exchange-rate__notice">{t("home.exchangeRateNotice")}</p>
          </article>
        </div>
      )}
    </section>
  );
}

function MetricCards({
  metrics,
  expandedMetricId,
  histories,
  historyRange,
  historyLoadingId,
  historyError,
  onToggleMetric,
  onRangeChange,
  locale,
  t,
}: {
  metrics: MetricSnapshot[];
  expandedMetricId: string | null;
  histories: Record<string, MetricHistoryResponse>;
  historyRange: HistoryRange;
  historyLoadingId: string | null;
  historyError: string | null;
  onToggleMetric: (metricId: string) => void;
  onRangeChange: (range: HistoryRange) => void;
  locale: string;
  t: Translate;
}) {
  if (metrics.length === 0) {
    return (
      <article className="econ-metric">
        <div>
          <span>{t("home.preference")}</span>
          <h2>{t("home.coreMetricsNone")}</h2>
        </div>
        <strong>
          --
          <small>{t("home.hidden")}</small>
        </strong>
        <p>{t("home.coreMetricsNoneHelp")}</p>
      </article>
    );
  }

  return (
    <>
      {metrics.map((metric) => {
        const expanded = expandedMetricId === metric.id;
        return (
          <article className={expanded ? "econ-metric is-expanded" : "econ-metric"} key={metric.id}>
            <button className="econ-metric__button" type="button" onClick={() => onToggleMetric(metric.id)}>
              <div>
                <span>{metric.category}</span>
                <h2>{metric.name}</h2>
              </div>
              <strong>
                {metric.value}
                <small>{metric.unit}</small>
              </strong>
              <p>{metric.interpretation}</p>
              <footer>
                <span>
                  {metric.change} · {metric.changePercent}
                </span>
                <a href={metric.sourceUrl} rel="noreferrer" target="_blank" onClick={(event) => event.stopPropagation()}>
                  {sourceLabel(metric)}
                </a>
              </footer>
            </button>
            {expanded && (
              <MetricHistoryPanel
                errorMessage={historyError}
                history={histories[metric.id] ?? null}
                isLoading={historyLoadingId === metric.id}
                locale={locale}
                onRangeChange={onRangeChange}
                range={historyRange}
                t={t}
              />
            )}
          </article>
        );
      })}
    </>
  );
}

export default function HomePage() {
  const { locale, t } = useI18n();
  const [dashboard, setDashboard] = useState<EconomyDashboard | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [preferences, setPreferences] = useState<DashboardPreferences | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>("home");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null);
  const [discussionUnreadCount, setDiscussionUnreadCount] = useState(0);
  const [eventItems, setEventItems] = useState<EconomicEvent[] | null>(null);
  const [reportItems, setReportItems] = useState<ReportItem[] | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>(null);
  const [historyRange, setHistoryRange] = useState<HistoryRange>("3y");
  const [metricHistories, setMetricHistories] = useState<Record<string, MetricHistoryResponse>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState("USD");

  const handleDiscussionUnreadCount = useCallback((count: number) => {
    setDiscussionUnreadCount(count);
  }, []);

  const handleWorkspaceSelect = useCallback((view: WorkspaceKey) => {
    if (workspaceRequiresAuth(view) && !currentUser) {
      setActiveWorkspace("home");
      setWorkspaceMessage(t("home.loginRequired"));
      return;
    }
    setWorkspaceMessage(null);
    setActiveWorkspace(view);
  }, [currentUser, t]);

  useEffect(() => {
    if (!currentUser && workspaceRequiresAuth(activeWorkspace)) {
      setActiveWorkspace("home");
    }
  }, [activeWorkspace, currentUser]);

  useEffect(() => {
    let cancelled = false;
    async function loadDiscussionNotifications() {
      if (!currentUser) {
        setDiscussionUnreadCount(0);
        return;
      }
      try {
        const response = await fetchBoardNotifications();
        if (!cancelled) {
          setDiscussionUnreadCount(response.unreadCount);
        }
      } catch {
        if (!cancelled) {
          setDiscussionUnreadCount(0);
        }
      }
    }
    void loadDiscussionNotifications();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setPreferenceMessage(null);

        const [nextDashboard, nextUser] = await Promise.all([
          fetchEconomyDashboard(locale),
          fetchCurrentUser(),
        ]);

        if (cancelled) {
          return;
        }

        setDashboard(nextDashboard);
        setCurrentUser(nextUser);

        if (nextUser) {
          try {
            const nextPreferences = await fetchDashboardPreferences();
            if (!cancelled) {
              setPreferences(nextPreferences);
            }
          } catch (error) {
            if (!cancelled) {
              setPreferenceMessage(
                error instanceof Error
                  ? error.message
                  : t("home.preferenceLoadFailed"),
              );
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : t("home.dashboardLoadFailed"),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [locale, t]);

  useEffect(() => {
    let cancelled = false;
    async function loadWorkspaceData() {
      if (activeWorkspace !== "events" && activeWorkspace !== "reports") {
        return;
      }
      if (!currentUser) {
        return;
      }
      try {
        setWorkspaceMessage(null);
        if (activeWorkspace === "events") {
          const response = await fetchEconomyEvents(locale);
          if (!cancelled) {
            setEventItems(response.items);
          }
        }
        if (activeWorkspace === "reports") {
          const response = await fetchEconomyReports(locale);
          if (!cancelled) {
            setReportItems(response.items);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setWorkspaceMessage(error instanceof Error ? error.message : t("home.dashboardLoadFailed"));
        }
      }
    }
    void loadWorkspaceData();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace, currentUser, locale, t]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!expandedMetricId) {
        return;
      }
      try {
        setHistoryLoadingId(expandedMetricId);
        setHistoryError(null);
        const response = await fetchMetricHistory(expandedMetricId, historyRange, locale as LocaleCode);
        if (!cancelled) {
          setMetricHistories((previous) => ({
            ...previous,
            [expandedMetricId]: response,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(error instanceof Error ? error.message : t("home.historyFailed"));
        }
      } finally {
        if (!cancelled) {
          setHistoryLoadingId(null);
        }
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [expandedMetricId, historyRange, locale, t]);

  const visibleMetrics = useMemo(
    () => filterByPreference(dashboard?.metrics ?? [], preferences?.coreMetricIds),
    [dashboard?.metrics, preferences?.coreMetricIds],
  );
  const visibleEvents = useMemo(
    () => filterByPreference<EconomicEvent>(eventItems ?? dashboard?.events ?? [], preferences?.eventIds),
    [dashboard?.events, eventItems, preferences?.eventIds],
  );
  const visibleReports = useMemo(
    () => filterByPreference<ReportItem>(reportItems ?? dashboard?.reports ?? [], preferences?.reportIds),
    [dashboard?.reports, preferences?.reportIds, reportItems],
  );
  const watchMetrics = useMemo(
    () => pickWatchMetrics(dashboard?.metrics ?? [], preferences),
    [dashboard?.metrics, preferences],
  );
  const evidenceMetrics = useMemo(() => {
    if (!dashboard) {
      return [];
    }
    return dashboard.metrics.filter((metric) =>
      dashboard.brief.evidenceMetricIds.includes(metric.id),
    );
  }, [dashboard]);
  const lastUpdated = dashboard?.metrics[0]?.updatedAt ?? dashboard?.brief.generatedAt;
  const exchangeRates = dashboard?.exchangeRates ?? [];

  async function handleLogout() {
    try {
      await logoutCurrentUser();
      setCurrentUser(null);
      setPreferences(null);
      setDiscussionUnreadCount(0);
      setPreferenceMessage(t("home.loggedOut"));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("home.logoutFailed"),
      );
    }
  }

  function handleToggleMetric(metricId: string) {
    setExpandedMetricId((current) => (current === metricId ? null : metricId));
  }

  function renderEvents() {
    return (
      <section className="econ-panel econ-workspace-panel" aria-label={t("home.economicEvents")}>
        <div className="econ-section-title">
          <strong>{t("home.economicEvents")}</strong>
          <span>{t("home.eventsSubtitle")}</span>
        </div>
        <div className="econ-event-list">
          {visibleEvents.length === 0 ? (
            <p className="econ-empty">{t("home.noEvents")}</p>
          ) : (
            visibleEvents.map((event) => (
              <article className="econ-event" key={event.id}>
                <div className="econ-event__date">
                  <span>{event.importance === "high" ? t("home.high") : t("home.general")}</span>
                  <strong>{formatDateTime(event.releaseDateTime, locale, t("home.syncWaiting"))}</strong>
                </div>
                <div>
                  <h2>{event.title}</h2>
                  <p>
                    {t("home.previous")} {event.previousValue}{event.unit} · {t("home.forecast")} {eventForecastText(event)}
                    · {t("home.actual")} {event.actualValue ? `${event.actualValue}${event.unit}` : t("home.pendingActual")}
                  </p>
                  <p>{event.interpretation}</p>
                  <a href={event.sourceUrl} rel="noreferrer" target="_blank">
                    {event.sourceType ?? event.sourceName}
                    {event.eventCategory ? ` · ${event.eventCategory}` : ""}
                  </a>
                  {event.estimatedForecast?.note && <p className="econ-event__forecast-note">{event.estimatedForecast.note}</p>}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    );
  }

  function renderReports() {
    return (
      <section className="econ-panel econ-workspace-panel" aria-label={t("home.reportsTitle")}>
        <div className="econ-section-title">
          <strong>{t("home.reportsTitle")}</strong>
          <span>{t("home.reportsSubtitle")}</span>
        </div>
        <div className="econ-report-list">
          {visibleReports.length === 0 ? (
            <p className="econ-empty">{t("home.noReports")}</p>
          ) : (
            visibleReports.map((report) => (
              <article className="econ-report" key={report.id}>
                <span>{report.category}</span>
                <h2>{report.title}</h2>
                <p>{report.summary}</p>
                <p>{report.koreaImplication}</p>
                <a href={report.sourceUrl} rel="noreferrer" target="_blank">
                  {report.sourceName}
                </a>
              </article>
            ))
          )}
        </div>
      </section>
    );
  }

  function renderWatchlist() {
    return (
      <section className="econ-panel econ-workspace-panel" aria-label={t("home.watchlist")}>
        <div className="econ-section-title">
          <strong>{t("home.watchlist")}</strong>
          <span>{isLoading ? t("home.syncing") : t("home.serverCache")}</span>
        </div>
        <section className="econ-metrics econ-metrics--watchlist">
          <MetricCards
            expandedMetricId={expandedMetricId}
            histories={metricHistories}
            historyError={historyError}
            historyLoadingId={historyLoadingId}
            historyRange={historyRange}
            locale={locale}
            metrics={watchMetrics}
            onRangeChange={setHistoryRange}
            onToggleMetric={handleToggleMetric}
            t={t}
          />
        </section>
      </section>
    );
  }

  function renderHome() {
    if (!dashboard) {
      return null;
    }
    return (
      <>
        <section className="econ-brief" aria-label={t("home.aiSummary")}>
          <article className="econ-brief__copy">
            <span className="econ-status">{dashboard.brief.statusLabel}</span>
            <h1>{t("home.title")}</h1>
            <p>{dashboard.brief.summary}</p>
            <p>{dashboard.brief.koreaImpact}</p>
            <div className="econ-sync-status">
              <span>{t("home.aiStatus")}: {dashboard.brief.generationStatus}</span>
              <span>{t("home.aiGenerated")}: {formatDateTime(dashboard.brief.generatedAt, locale, t("home.syncWaiting"))}</span>
            </div>
            <div className="econ-evidence" aria-label={t("home.aiSummary")}>
              {evidenceMetrics.map((metric) => (
                <a href={metric.sourceUrl} key={metric.id} rel="noreferrer" target="_blank">
                  {metric.name}
                </a>
              ))}
            </div>
          </article>

          <article className="econ-brief__signal" aria-label={t("home.guardrailsPass")}>
            <div className="econ-pulse">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <strong>{t("home.guardrailsPass")}</strong>
            <p>{dashboard.brief.risks[0] ?? t("home.riskFallback")}</p>
          </article>
        </section>

        <section className="econ-metrics" aria-label={t("home.coreMetrics")}>
          <ExchangeRatePanel
            locale={locale}
            onSelectCurrency={setSelectedCurrencyCode}
            rates={exchangeRates}
            selectedCurrencyCode={selectedCurrencyCode}
            t={t}
          />
          <MetricCards
            expandedMetricId={expandedMetricId}
            histories={metricHistories}
            historyError={historyError}
            historyLoadingId={historyLoadingId}
            historyRange={historyRange}
            locale={locale}
            metrics={visibleMetrics}
            onRangeChange={setHistoryRange}
            onToggleMetric={handleToggleMetric}
            t={t}
          />
        </section>
      </>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <main className="econ-shell">
          <aside className="econ-sidebar" aria-label={t("home.nav.home")}>
            <div className="econ-brand">
              <div className="econ-brand__mark" aria-hidden="true">
                AI
              </div>
              <div>
                <strong>US ECON AI</strong>
                <span>{t("home.brandSubtitle")}</span>
              </div>
            </div>

            <nav className="econ-nav" aria-label={t("home.nav.home")}>
              {navigationItems.map((item) => (
                <button
                  className={item.view === activeWorkspace ? "econ-nav__item is-active" : "econ-nav__item"}
                  key={item.labelKey}
                  type="button"
                  onClick={() => handleWorkspaceSelect(item.view)}
                >
                  <IonIcon icon={item.icon} />
                  <span>{t(item.labelKey)}</span>
                  {item.view === "discussion" && discussionUnreadCount > 0 && (
                    <small className="econ-nav__badge">{discussionUnreadCount}</small>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          <section className="econ-main">
            <header className="econ-topbar">
              <div className="econ-search" role="search">
                <IonIcon icon={searchOutline} />
                <span>{t("home.searchText")}</span>
              </div>
              <div className="econ-topbar__actions">
                <DisplaySettingsControl />
                <button className="econ-icon-button" aria-label={t("home.refresh")} type="button" onClick={() => window.location.reload()}>
                  <IonIcon icon={refreshOutline} />
                </button>
                <button
                  className="econ-icon-button"
                  aria-label={t("home.notifications")}
                  type="button"
                  onClick={() => handleWorkspaceSelect("discussion")}
                >
                  <IonIcon icon={notificationsOutline} />
                  {discussionUnreadCount > 0 && <span className="econ-icon-badge">{discussionUnreadCount}</span>}
                </button>
                <span className="econ-freshness">
                  {lastUpdated
                    ? `${formatDateTime(lastUpdated, locale, t("home.syncWaiting"))} ${t("home.updated")}`
                    : t("home.syncWaiting")}
                </span>
                {currentUser ? (
                  <>
                    {currentUser.roles.includes("ROLE_ADMIN") && (
                      <Link className="econ-admin-button" to="/admin">
                        <IonIcon icon={shieldCheckmarkOutline} />
                        <span>Admin</span>
                      </Link>
                    )}
                    <Link className="econ-profile-button" to="/mypage">
                      {currentUser.avatarUrl ? (
                        <img alt="" src={currentUser.avatarUrl} />
                      ) : (
                        <IonIcon icon={personCircleOutline} />
                      )}
                      <span>{currentUser.displayNickname || currentUser.displayName || currentUser.username}</span>
                    </Link>
                    <button className="econ-logout-button" type="button" onClick={() => void handleLogout()}>
                      <IonIcon icon={logOutOutline} />
                      <span>{t("home.logout")}</span>
                    </button>
                  </>
                ) : (
                  <Link className="econ-login-button" to="/auth">
                    <IonIcon icon={logInOutline} />
                    <span>{t("home.loginOrSignup")}</span>
                  </Link>
                )}
              </div>
            </header>

            {isLoading && (
              <section className="econ-state" aria-live="polite">
                <IonIcon icon={refreshOutline} />
                <strong>{t("home.latestDataTitle")}</strong>
                <span>{t("home.latestDataBody")}</span>
              </section>
            )}

            {errorMessage && (
              <section className="econ-state is-error" aria-live="assertive">
                <strong>{t("home.dataError")}</strong>
                <span>{errorMessage}</span>
              </section>
            )}

            {preferenceMessage && (
              <section className="econ-state" aria-live="polite">
                <strong>{t("home.preferenceDefault")}</strong>
                <span>{preferenceMessage}</span>
              </section>
            )}

            {workspaceMessage && (
              <section className="econ-state is-error" aria-live="assertive">
                <strong>{t("home.dataError")}</strong>
                <span>{workspaceMessage}</span>
              </section>
            )}

            {activeWorkspace === "agent" ? (
              <AgentWorkbench currentUser={currentUser} dashboard={dashboard} />
            ) : activeWorkspace === "discussion" ? (
              <DiscussionBoard
                currentUser={currentUser}
                onUnreadCountChange={handleDiscussionUnreadCount}
              />
            ) : activeWorkspace === "events" ? (
              renderEvents()
            ) : activeWorkspace === "reports" ? (
              renderReports()
            ) : activeWorkspace === "watchlist" ? (
              renderWatchlist()
            ) : (
              renderHome()
            )}
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
}

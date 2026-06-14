import { FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  chatbubbleEllipsesOutline,
  logInOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  timeOutline,
  trashOutline,
} from "ionicons/icons";

import {
  createAgentBriefingRun,
  deleteAgentRun,
  fetchAgentCatalog,
  fetchAgentRun,
  fetchAgentRuns,
  sendCatalogAgentMessage,
  type AgentDefinition,
  type AgentMessage,
  type AgentRunDetail,
  type AgentRunSummary,
} from "../api/agents";
import { getGoogleLoginUrl } from "../../auth/api/authApi";
import type { CurrentUser } from "../../../api/backend";
import type { EconomyDashboard } from "../../economy/api/economy";
import { useI18n } from "../../../i18n/I18nProvider";

import "./AgentWorkbench.css";

interface AgentWorkbenchProps {
  currentUser: CurrentUser | null;
  dashboard: EconomyDashboard | null;
}

interface PendingChat {
  agentName: string;
  userMessage: string;
}

function formatDateTime(value: string | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }
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

function evidenceHref(sourceUrl: string) {
  if (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) {
    return sourceUrl;
  }
  const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN ?? "http://localhost:8080";
  return `${backendOrigin}${sourceUrl}`;
}

function answerStatusLabel(status: string | null, t: ReturnType<typeof useI18n>["t"]) {
  if (status === "insufficient_evidence") {
    return t("agent.status.insufficient");
  }
  if (status === "fallback") {
    return t("agent.status.fallback");
  }
  if (status === "answered") {
    return t("agent.status.answered");
  }
  return status || "";
}

function runEvidenceIds(run: AgentRunSummary) {
  return [
    ...run.evidenceMetricIds.map((id) => `metric:${id}`),
    ...run.evidenceEventIds.map((id) => `event:${id}`),
    ...run.evidenceNewsIds.map((id) => `news:${id}`),
    ...run.evidenceRagChunkIds.map((id) => `rag:${id}`),
  ];
}

function messageEvidenceIds(item: AgentMessage) {
  return [
    ...item.evidenceMetricIds.map((id) => `metric:${id}`),
    ...item.evidenceEventIds.map((id) => `event:${id}`),
    ...item.evidenceNewsIds.map((id) => `news:${id}`),
    ...item.evidenceRagChunkIds.map((id) => `rag:${id}`),
  ];
}

export default function AgentWorkbench({ currentUser, dashboard }: AgentWorkbenchProps) {
  const { locale, t } = useI18n();
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [activeRun, setActiveRun] = useState<AgentRunDetail | null>(null);
  const [catalog, setCatalog] = useState<AgentDefinition[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("beginner-explainer");
  const [message, setMessage] = useState("");
  const [pendingChat, setPendingChat] = useState<PendingChat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setRuns([]);
      setActiveRun(null);
      setCatalog([]);
      return;
    }

    let cancelled = false;

    async function loadWorkbench() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const [nextCatalog, nextRuns] = await Promise.all([
          fetchAgentCatalog(locale),
          fetchAgentRuns(locale),
        ]);
        const latestRun = nextRuns[0] ? await fetchAgentRun(nextRuns[0].id) : null;
        if (cancelled) {
          return;
        }
        setCatalog(nextCatalog);
        setSelectedAgentId((current) => nextCatalog.some((agent) => agent.id === current)
          ? current
          : nextCatalog[0]?.id ?? "beginner-explainer");
        setRuns(nextRuns);
        setActiveRun(latestRun);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : t("agent.error.workbench"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadWorkbench();

    return () => {
      cancelled = true;
    };
  }, [currentUser, locale, t]);

  const selectedAgent = useMemo(
    () => catalog.find((agent) => agent.id === selectedAgentId) ?? catalog[0],
    [catalog, selectedAgentId],
  );

  const evidenceIds = useMemo(
    () => activeRun ? runEvidenceIds(activeRun.run) : [],
    [activeRun],
  );

  const chatMessages = useMemo(
    () => activeRun?.messages.filter((item) => item.answerStatus || item.role === "user") ?? [],
    [activeRun],
  );

  useEffect(() => {
    const element = messageListRef.current;
    if (!element) {
      return;
    }
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length, pendingChat]);

  async function handleRefreshSummary() {
    try {
      setIsRefreshing(true);
      setErrorMessage(null);
      const detail = await createAgentBriefingRun(locale);
      setActiveRun(detail);
      setRuns((current) => [detail.run, ...current.filter((run) => run.id !== detail.run.id)]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("agent.error.summary"));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSelectRun(runId: number) {
    try {
      setErrorMessage(null);
      const detail = await fetchAgentRun(runId);
      setActiveRun(detail);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("agent.error.run"));
    }
  }

  async function handleChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAgent || !message.trim() || !activeRun) {
      return;
    }

    const submittedMessage = message.trim();

    try {
      setIsChatting(true);
      setErrorMessage(null);
      setPendingChat({
        agentName: selectedAgent.name,
        userMessage: submittedMessage,
      });
      setMessage("");
      const response = await sendCatalogAgentMessage(
        selectedAgent.id,
        submittedMessage,
        activeRun.run.id,
        locale,
      );
      setActiveRun(response.run);
      setRuns((current) => [response.run.run, ...current.filter((run) => run.id !== response.run.run.id)]);
    } catch (error) {
      setMessage(submittedMessage);
      setErrorMessage(error instanceof Error ? error.message : t("agent.error.chat"));
    } finally {
      setPendingChat(null);
      setIsChatting(false);
    }
  }

  async function handleDeleteRun(runId: number, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (isChatting || deletingRunId) {
      return;
    }
    const confirmed = window.confirm(t("agent.delete.confirm"));
    if (!confirmed) {
      return;
    }

    try {
      setDeletingRunId(runId);
      setErrorMessage(null);
      await deleteAgentRun(runId);
      if (activeRun?.run.id === runId) {
        const nextRuns = await fetchAgentRuns(locale);
        const nextActiveRun = nextRuns[0] ? await fetchAgentRun(nextRuns[0].id) : null;
        setActiveRun(nextActiveRun);
        setRuns(nextRuns);
      } else {
        setRuns((current) => current.filter((run) => run.id !== runId));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("agent.delete.error"));
    } finally {
      setDeletingRunId(null);
    }
  }

  if (!currentUser) {
    return (
      <section className="agent-login">
        <IonIcon icon={logInOutline} />
        <strong>{t("agent.login.required")}</strong>
        <p>{t("agent.login.body")}</p>
        <a href={getGoogleLoginUrl()}>{t("agent.login.google")}</a>
      </section>
    );
  }

  return (
    <section className="agent-workbench" aria-label={t("agent.header.title")}>
      <header className="agent-header">
        <div>
          <span>{t("agent.header.kicker")}</span>
          <h1>{t("agent.header.title")}</h1>
          <p>{t("agent.header.body")}</p>
        </div>
        <button type="button" onClick={handleRefreshSummary} disabled={isRefreshing || isLoading || !dashboard}>
          <IonIcon icon={refreshOutline} />
          <span>{isRefreshing ? t("agent.refreshing") : t("agent.refresh")}</span>
        </button>
      </header>

      {errorMessage && <p className="agent-error">{errorMessage}</p>}

      <div className="agent-grid">
        <main className="agent-main">
          <article className="agent-summary-card" aria-label={t("agent.summary.aria")}>
            <div className="agent-card-kicker">
              <span>
                <IonIcon icon={sparklesOutline} />
                {t("agent.summary.title")}
              </span>
              <small>{isLoading ? t("agent.loading") : activeRun?.run.status ?? t("agent.pending")}</small>
            </div>
            {activeRun ? (
              <>
                <h2>{activeRun.run.statusLabel || t("agent.summary.ready")}</h2>
                <p>{activeRun.run.summary}</p>
                <p>{activeRun.run.koreaImpact}</p>
                <div className="agent-meta-row">
                  <span>
                    <IonIcon icon={timeOutline} />
                    {formatDateTime(activeRun.run.completedAt, locale, t("agent.pending"))}
                  </span>
                  <span>
                    <IonIcon icon={shieldCheckmarkOutline} />
                    {evidenceIds.length} {t("agent.evidence")}
                  </span>
                  <span>{activeRun.run.runType}</span>
                </div>
                {activeRun.run.errorMessage && (
                  <small className="agent-warning">{activeRun.run.errorMessage}</small>
                )}
                {evidenceIds.length > 0 && (
                  <div className="agent-evidence-pills" aria-label={t("agent.summaryEvidence")}>
                    {evidenceIds.map((id) => (
                      <span key={id}>{id}</span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p>{isLoading ? t("agent.summary.loading") : t("agent.summary.empty")}</p>
            )}
          </article>

          <section className="agent-catalog" aria-label={t("agent.select")}>
            <div className="agent-panel-title">
              <strong>{t("agent.select")}</strong>
              <span>{catalog.length} {t("agent.agentsSuffix")}</span>
            </div>
            <div className="agent-catalog-strip" role="tablist" aria-label={t("agent.select")}>
              {catalog.map((agent) => (
                <button
                  aria-selected={selectedAgentId === agent.id}
                  className={selectedAgentId === agent.id ? "agent-chip is-active" : "agent-chip"}
                  disabled={isChatting}
                  key={agent.id}
                  role="tab"
                  type="button"
                  onClick={() => setSelectedAgentId(agent.id)}
                  title={agent.description}
                >
                  <strong>{agent.name}</strong>
                  <span>{agent.focus}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="agent-chat-panel" aria-label={t("agent.chat.aria")}>
            <div className="agent-panel-title">
              <strong>
                <IonIcon icon={chatbubbleEllipsesOutline} />
                {selectedAgent?.name ?? t("agent.chat.fallback")}
              </strong>
              <span>{selectedAgent?.focus ?? t("agent.dashboardRag")}</span>
            </div>

            <div className="agent-message-list" ref={messageListRef}>
              {chatMessages.length === 0 && !pendingChat ? (
                <p className="agent-empty">{activeRun ? t("agent.chat.empty") : t("agent.chat.needsRun")}</p>
              ) : (
                <>
                {chatMessages.map((item) => {
                  const itemEvidenceIds = messageEvidenceIds(item);
                  return (
                    <article className={`agent-message is-${item.role}`} key={item.id}>
                      <div className="agent-message-head">
                        <span>{item.role === "user" ? t("agent.user") : item.role === "assistant" ? t("agent.assistant") : item.role}</span>
                        {item.answerStatus && (
                          <strong className={`agent-status is-${item.answerStatus}`}>
                            {answerStatusLabel(item.answerStatus, t)}
                          </strong>
                        )}
                      </div>
                      <p>{item.content}</p>
                      {itemEvidenceIds.length > 0 && (
                        <div className="agent-message-evidence" aria-label={t("agent.messageEvidence")}>
                          {itemEvidenceIds.map((id) => (
                            <span key={id}>{id}</span>
                          ))}
                        </div>
                      )}
                      {item.evidenceItems.length > 0 && (
                        <div className="agent-message-sources">
                          {item.evidenceItems.map((evidence) => (
                            <a
                              href={evidenceHref(evidence.sourceUrl)}
                              key={`${item.id}-${evidence.type}-${evidence.id}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {evidence.type} / {evidence.title}
                            </a>
                          ))}
                        </div>
                      )}
                      {item.steps.length > 0 && (
                        <div className="agent-message-trace">
                          {item.steps.map((step, index) => (
                            <span key={`${item.id}-${step.guardrail}-${index}`}>
                              {step.agent} / {step.result}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
                {pendingChat && (
                  <>
                    <article className="agent-message is-user is-pending">
                      <div className="agent-message-head">
                        <span>{t("agent.user")}</span>
                        <strong className="agent-status is-pending">{t("agent.sending")}</strong>
                      </div>
                      <p>{pendingChat.userMessage}</p>
                    </article>
                    <article className="agent-message is-assistant is-pending" aria-live="polite">
                      <div className="agent-message-head">
                        <span>{t("agent.assistant")}</span>
                        <strong className="agent-status is-pending">{t("agent.thinking")}</strong>
                      </div>
                      <p>
                        {pendingChat.agentName}{t("agent.waiting.answer")}
                        <span className="agent-typing-dots" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                      </p>
                    </article>
                  </>
                )}
                </>
              )}
            </div>

            <form className="agent-chat-form" onSubmit={handleChat}>
              <input
                aria-label={t("agent.aria.question")}
                disabled={isChatting || !activeRun}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={isChatting ? t("agent.chat.waiting") : activeRun ? t("agent.chat.placeholder") : t("agent.chat.needsRun")}
              />
              <button type="submit" disabled={isChatting || !message.trim() || !selectedAgent || !activeRun}>
                {isChatting ? t("agent.sending") : t("agent.send")}
              </button>
            </form>
          </section>
        </main>

        <aside className="agent-history" aria-label={t("agent.history")}>
          <div className="agent-panel-title">
            <strong>{t("agent.history")}</strong>
            <span>{isLoading ? t("agent.loading") : `${runs.length} ${t("agent.savedSuffix")}`}</span>
          </div>
          <div className="agent-history-list">
            {runs.length === 0 ? (
              <p className="agent-empty">{t("agent.emptyHistory")}</p>
            ) : (
              runs.map((run) => (
                <article
                  className={activeRun?.run.id === run.id ? "agent-run is-active" : "agent-run"}
                  key={run.id}
                >
                  <button
                    className="agent-run-main"
                    disabled={deletingRunId === run.id || isChatting}
                    type="button"
                    onClick={() => handleSelectRun(run.id)}
                  >
                    <span>{run.runType} / {run.status}</span>
                    <strong>{run.statusLabel || t("agent.runFallback")}</strong>
                    <small>{formatDateTime(run.createdAt, locale, t("agent.pending"))}</small>
                  </button>
                  <button
                    aria-label={`${run.statusLabel || t("agent.runFallback")} ${t("agent.delete.label")}`}
                    className="agent-run-delete"
                    disabled={deletingRunId === run.id || isChatting}
                    type="button"
                    onClick={(event) => void handleDeleteRun(run.id, event)}
                  >
                    <IonIcon icon={trashOutline} />
                  </button>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

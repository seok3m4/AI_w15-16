import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IonContent, IonIcon, IonPage } from "@ionic/react";
import { arrowBackOutline, logInOutline, saveOutline } from "ionicons/icons";

import {
  fetchCurrentUser,
  fetchDashboardPreferences,
  saveDashboardPreferences,
  saveUserProfile,
  type CurrentUser,
  type DashboardPreferences,
} from "../../../api/backend";
import { fetchEconomyDashboard } from "../../economy/api/economy";
import type { EconomyDashboard } from "../../economy/api/economy";
import { useI18n } from "../../../i18n/I18nProvider";
import DisplaySettingsControl from "../../../theme/DisplaySettingsControl";

import "../../economy/pages/HomePage.css";
import "./MyPage.css";

const SECTION_OPTIONS = [
  { id: "core-metrics", labelKey: "home.coreMetrics" },
  { id: "economic-events", labelKey: "home.economicEvents" },
  { id: "reports", labelKey: "home.reports" },
  { id: "watchlist", labelKey: "home.watchlist" },
] as const;

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function selectedIds(saved: string[], allIds: string[]) {
  return saved.length === 0 ? allIds : saved;
}

function nextItemSelection(saved: string[], allIds: string[], id: string) {
  const current = selectedIds(saved, allIds);
  const next = toggleValue(current, id);
  return next.length === allIds.length ? [] : next;
}

function nextVisibleSectionSelection(saved: string[], id: string) {
  const next = toggleValue(saved, id);
  return next.length === 0 ? saved : next;
}

export default function MyPage() {
  const { locale, t } = useI18n();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [dashboard, setDashboard] = useState<EconomyDashboard | null>(null);
  const [draft, setDraft] = useState<DashboardPreferences | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMyPage() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const user = await fetchCurrentUser();
        if (cancelled) {
          return;
        }
        setCurrentUser(user);
        setNicknameDraft(user?.nickname ?? user?.displayName ?? "");

        if (!user) {
          return;
        }

        const [nextDashboard, nextPreferences] = await Promise.all([
          fetchEconomyDashboard(locale),
          fetchDashboardPreferences(),
        ]);

        if (!cancelled) {
          setDashboard(nextDashboard);
          setDraft(nextPreferences);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : t("mypage.settingsLoadFailed"),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadMyPage();

    return () => {
      cancelled = true;
    };
  }, [locale, t]);

  const metricIds = useMemo(
    () => dashboard?.metrics.map((metric) => metric.id) ?? [],
    [dashboard?.metrics],
  );
  const eventIds = useMemo(
    () => dashboard?.events.map((event) => event.id) ?? [],
    [dashboard?.events],
  );
  const reportIds = useMemo(
    () => dashboard?.reports.map((report) => report.id) ?? [],
    [dashboard?.reports],
  );

  function updateDraft(next: DashboardPreferences) {
    setDraft(next);
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSave() {
    if (!draft) {
      return;
    }
    if (draft.visibleSections.length === 0) {
      setErrorMessage(t("mypage.sectionsMinimum"));
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      const saved = await saveDashboardPreferences(draft);
      setDraft(saved);
      setMessage(t("mypage.saved"));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("mypage.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleProfileSave() {
    if (!nicknameDraft.trim()) {
      setErrorMessage(t("mypage.nicknameRequired"));
      return;
    }

    try {
      setIsSavingProfile(true);
      setErrorMessage(null);
      const saved = await saveUserProfile({ nickname: nicknameDraft.trim() });
      setCurrentUser(saved);
      setNicknameDraft(saved.nickname ?? saved.displayNickname);
      setMessage(t("mypage.nicknameSaved"));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("mypage.nicknameSaveFailed"));
    } finally {
      setIsSavingProfile(false);
    }
  }

  const userLabel =
    currentUser?.displayNickname ||
    currentUser?.displayName ||
    currentUser?.username ||
    t("mypage.userFallback");

  return (
    <IonPage>
      <IonContent fullscreen>
        <main className="mypage-shell">
          <header className="mypage-header">
            <Link className="econ-login-button" to="/home">
              <IonIcon icon={arrowBackOutline} />
              <span>{t("mypage.backHome")}</span>
            </Link>
            <div className="mypage-header__actions">
              <DisplaySettingsControl />
              <div className="mypage-header__title">
                <strong>{t("mypage.headerTitle")}</strong>
                <span>{t("mypage.headerSubtitle")}</span>
              </div>
            </div>
          </header>

          {isLoading && (
            <section className="econ-state">
              <strong>{t("mypage.loadingTitle")}</strong>
              <span>{t("mypage.loadingBody")}</span>
            </section>
          )}

          {!isLoading && !currentUser && (
            <section className="mypage-login-panel">
              <h1>{t("mypage.loginTitle")}</h1>
              <p>{t("mypage.loginBody")}</p>
              <Link className="econ-login-button" to="/auth">
                <IonIcon icon={logInOutline} />
                <span>{t("home.loginOrSignup")}</span>
              </Link>
            </section>
          )}

          {errorMessage && (
            <section className="econ-state is-error" aria-live="assertive">
              <strong>{t("mypage.requestFailed")}</strong>
              <span>{errorMessage}</span>
            </section>
          )}

          {currentUser && draft && dashboard && (
            <section className="mypage-grid">
              <aside className="mypage-profile">
                {currentUser.avatarUrl ? (
                  <img alt="" src={currentUser.avatarUrl} />
                ) : (
                  <div>{userLabel.slice(0, 1).toUpperCase()}</div>
                )}
                <strong>{userLabel}</strong>
                <span>{currentUser.email ?? currentUser.provider}</span>
                {message && <p>{message}</p>}
                <label className="mypage-profile__field">
                  <span>{t("mypage.nicknameLabel")}</span>
                  <input
                    maxLength={20}
                    minLength={2}
                    placeholder={t("mypage.nicknamePlaceholder")}
                    value={nicknameDraft}
                    onChange={(event) => setNicknameDraft(event.target.value)}
                  />
                </label>
                <button
                  className="mypage-save"
                  disabled={isSavingProfile}
                  type="button"
                  onClick={() => void handleProfileSave()}
                >
                  <IonIcon icon={saveOutline} />
                  <span>{isSavingProfile ? t("mypage.nicknameSaving") : t("mypage.nicknameSave")}</span>
                </button>
                <button className="mypage-save" disabled={isSaving} type="button" onClick={handleSave}>
                  <IonIcon icon={saveOutline} />
                  <span>{isSaving ? t("mypage.saving") : t("mypage.save")}</span>
                </button>
              </aside>

              <section className="mypage-settings" aria-label={t("mypage.dashboardSettings")}>
                <article className="mypage-card">
                  <div className="mypage-card__title">
                    <strong>{t("mypage.sections")}</strong>
                    <span>{t("mypage.sectionsSubtitle")}</span>
                  </div>
                  <div className="mypage-toggle-list">
                    {SECTION_OPTIONS.map((section) => {
                      const isChecked = draft.visibleSections.includes(section.id);
                      const isOnlyVisibleSection = isChecked && draft.visibleSections.length === 1;
                      return (
                        <label
                          className={isOnlyVisibleSection ? "mypage-check is-disabled" : "mypage-check"}
                          key={section.id}
                        >
                          <input
                            checked={isChecked}
                            disabled={isOnlyVisibleSection}
                            type="checkbox"
                            onChange={() =>
                              updateDraft({
                                ...draft,
                                visibleSections: nextVisibleSectionSelection(draft.visibleSections, section.id),
                              })
                            }
                          />
                          <span>{t(section.labelKey)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mypage-help">{t("mypage.sectionsMinimum")}</p>
                </article>

                <article className="mypage-card">
                  <div className="mypage-card__title">
                    <strong>{t("home.coreMetrics")}</strong>
                    <span>{t("mypage.coreSubtitle")}</span>
                  </div>
                  <div className="mypage-option-grid">
                    {dashboard.metrics.map((metric) => (
                      <label className="mypage-check" key={metric.id}>
                        <input
                          checked={selectedIds(draft.coreMetricIds, metricIds).includes(metric.id)}
                          type="checkbox"
                          onChange={() =>
                            updateDraft({
                              ...draft,
                              coreMetricIds: nextItemSelection(draft.coreMetricIds, metricIds, metric.id),
                            })
                          }
                        />
                        <span>{metric.name}</span>
                      </label>
                    ))}
                  </div>
                </article>

                <article className="mypage-card">
                  <div className="mypage-card__title">
                    <strong>{t("home.watchlist")}</strong>
                    <span>{t("mypage.watchSubtitle")}</span>
                  </div>
                  <div className="mypage-option-grid">
                    {dashboard.metrics.map((metric) => (
                      <label className="mypage-check" key={metric.id}>
                        <input
                          checked={selectedIds(draft.watchMetricIds, metricIds).includes(metric.id)}
                          type="checkbox"
                          onChange={() =>
                            updateDraft({
                              ...draft,
                              watchMetricIds: nextItemSelection(draft.watchMetricIds, metricIds, metric.id),
                            })
                          }
                        />
                        <span>{metric.name}</span>
                      </label>
                    ))}
                  </div>
                </article>

                <article className="mypage-card">
                  <div className="mypage-card__title">
                    <strong>{t("home.economicEvents")}</strong>
                    <span>{t("mypage.eventsSubtitle")}</span>
                  </div>
                  <div className="mypage-option-grid">
                    {dashboard.events.length === 0 ? (
                      <p className="econ-empty">{t("mypage.eventsEmpty")}</p>
                    ) : (
                      dashboard.events.map((event) => (
                        <label className="mypage-check" key={event.id}>
                          <input
                            checked={selectedIds(draft.eventIds, eventIds).includes(event.id)}
                            type="checkbox"
                            onChange={() =>
                              updateDraft({
                                ...draft,
                                eventIds: nextItemSelection(draft.eventIds, eventIds, event.id),
                              })
                            }
                          />
                          <span>{event.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                </article>

                <article className="mypage-card">
                  <div className="mypage-card__title">
                    <strong>{t("home.reports")}</strong>
                    <span>{t("mypage.reportsSubtitle")}</span>
                  </div>
                  <div className="mypage-option-grid">
                    {dashboard.reports.length === 0 ? (
                      <p className="econ-empty">{t("mypage.reportsEmpty")}</p>
                    ) : (
                      dashboard.reports.map((report) => (
                        <label className="mypage-check" key={report.id}>
                          <input
                            checked={selectedIds(draft.reportIds, reportIds).includes(report.id)}
                            type="checkbox"
                            onChange={() =>
                              updateDraft({
                                ...draft,
                                reportIds: nextItemSelection(draft.reportIds, reportIds, report.id),
                              })
                            }
                          />
                          <span>{report.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                </article>
              </section>
            </section>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
}

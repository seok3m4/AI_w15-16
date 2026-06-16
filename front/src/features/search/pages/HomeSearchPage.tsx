import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { IonContent, IonIcon, IonPage } from "@ionic/react";
import {
  arrowBackOutline,
  calendarOutline,
  chatbubblesOutline,
  documentTextOutline,
  logInOutline,
  openOutline,
  searchOutline,
} from "ionicons/icons";

import type { BoardPostSummary } from "../../board/api/posts";
import type { EconomicEvent, ReportItem } from "../../economy/api/economy";
import { fetchHomeSearch, type HomeSearchResponse } from "../api/homeSearch";
import { useI18n } from "../../../i18n/I18nProvider";

import "./HomeSearchPage.css";

function formatDateTime(value: string, locale: string, fallback = "-") {
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

function searchQuery(search: string) {
  const params = new URLSearchParams(search);
  return params.get("query") ?? params.get("q") ?? "";
}

function homeTarget(params: Record<string, string | number>) {
  return `/home?${new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
  )}`;
}

function ResultSection({
  icon,
  title,
  count,
  emptyText,
  children,
}: {
  icon: string;
  title: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="home-search-section">
      <header className="home-search-section__header">
        <IonIcon icon={icon} />
        <div>
          <strong>{title}</strong>
          <span>{count}개 결과</span>
        </div>
      </header>
      {count === 0 ? <p className="home-search-empty">{emptyText}</p> : children}
    </section>
  );
}

function DiscussionCard({ item, locale }: { item: BoardPostSummary; locale: string }) {
  return (
    <Link className="home-search-card home-search-card--link" to={homeTarget({ view: "discussion", postId: item.id })}>
      <span>{item.category}</span>
      <h2>{item.title}</h2>
      <p>{item.excerpt}</p>
      <footer>
        <small>{item.authorProfile?.nickname || item.author}</small>
        <small>{formatDateTime(item.createdAt, locale)}</small>
        <small>
          좋아요 {item.likeCount} / 댓글 {item.commentCount}
        </small>
      </footer>
      {item.tags.length > 0 && (
        <div className="home-search-tags">
          {item.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}
      <span className="home-search-open">
        <IonIcon icon={openOutline} />
        <span>토론에서 열기</span>
      </span>
    </Link>
  );
}

function EventCard({ item, locale }: { item: EconomicEvent; locale: string }) {
  return (
    <Link className="home-search-card home-search-card--link" to={homeTarget({ view: "events", eventId: item.id })}>
      <span>{item.importance === "high" ? "중요 일정" : "경제 일정"}</span>
      <h2>{item.title}</h2>
      <p>{item.interpretation}</p>
      <footer>
        <small>{formatDateTime(item.releaseDateTime, locale)}</small>
        <small>{item.sourceName}</small>
        <small>{item.status}</small>
      </footer>
      <span className="home-search-open">
        <IonIcon icon={openOutline} />
        <span>경제일정에서 열기</span>
      </span>
    </Link>
  );
}

function ReportCard({ item }: { item: ReportItem }) {
  return (
    <Link className="home-search-card home-search-card--link" to={homeTarget({ view: "reports", reportId: item.id })}>
      <span>{item.category}</span>
      <h2>{item.title}</h2>
      <p>{item.summary}</p>
      <p>{item.koreaImplication}</p>
      <footer>
        <small>{item.sourceName}</small>
        <small>{item.relatedMetricIds.join(", ")}</small>
      </footer>
      <span className="home-search-open">
        <IonIcon icon={openOutline} />
        <span>리포트에서 열기</span>
      </span>
    </Link>
  );
}

export default function HomeSearchPage() {
  const { locale } = useI18n();
  const location = useLocation();
  const history = useHistory();
  const query = useMemo(() => searchQuery(location.search).trim(), [location.search]);
  const [queryDraft, setQueryDraft] = useState(query);
  const [results, setResults] = useState<HomeSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setQueryDraft(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      if (!query) {
        setResults(null);
        setErrorMessage(null);
        return;
      }
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await fetchHomeSearch(query, locale);
        if (!cancelled) {
          setResults(response);
        }
      } catch (error) {
        if (!cancelled) {
          setResults(null);
          setErrorMessage(error instanceof Error ? error.message : "검색에 실패했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [locale, query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = queryDraft.trim();
    if (!nextQuery) {
      return;
    }
    const params = new URLSearchParams({ query: nextQuery, locale });
    history.push(`/search?${params}`);
  }

  const totalCount =
    (results?.discussions.length ?? 0)
    + (results?.events.length ?? 0)
    + (results?.reports.length ?? 0);

  return (
    <IonPage>
      <IonContent fullscreen>
        <main className="home-search-shell">
          <section className="home-search-page">
            <header className="home-search-header">
              <Link className="home-search-back" to="/home">
                <IonIcon icon={arrowBackOutline} />
                <span>홈으로</span>
              </Link>
              <div>
                <span>US ECON AI</span>
                <h1>통합 검색</h1>
                <p>토론, 경제일정, 리포트를 한 번에 찾아봅니다.</p>
              </div>
              <form className="home-search-form" role="search" onSubmit={handleSubmit}>
                <IonIcon icon={searchOutline} />
                <input
                  aria-label="검색어"
                  placeholder="검색어를 입력하세요"
                  value={queryDraft}
                  onChange={(event) => setQueryDraft(event.target.value)}
                />
                <button disabled={!queryDraft.trim()} type="submit">
                  검색
                </button>
              </form>
            </header>

            {isLoading && (
              <section className="home-search-state" aria-live="polite">
                <strong>검색 중</strong>
                <span>{query} 관련 항목을 모으고 있습니다.</span>
              </section>
            )}

            {errorMessage && (
              <section className="home-search-state is-error" aria-live="assertive">
                <strong>검색 실패</strong>
                <span>{errorMessage}</span>
                {errorMessage.includes("로그인") && (
                  <Link to="/auth">
                    <IonIcon icon={logInOutline} />
                    <span>로그인 / 회원가입</span>
                  </Link>
                )}
              </section>
            )}

            {!query && (
              <section className="home-search-state">
                <strong>검색어를 입력하세요</strong>
                <span>예: CPI, 금리, 환율, 고용, 소비</span>
              </section>
            )}

            {results && !isLoading && (
              <>
                <section className="home-search-summary">
                  <strong>{results.query}</strong>
                  <span>총 {totalCount}개 결과</span>
                </section>

                <div className="home-search-grid">
                  <ResultSection
                    count={results.discussions.length}
                    emptyText="비슷한 토론을 찾지 못했습니다."
                    icon={chatbubblesOutline}
                    title="토론"
                  >
                    <div className="home-search-list">
                      {results.discussions.map((item) => (
                        <DiscussionCard item={item} key={item.id} locale={locale} />
                      ))}
                    </div>
                  </ResultSection>

                  <ResultSection
                    count={results.events.length}
                    emptyText="관련 경제일정이 없습니다."
                    icon={calendarOutline}
                    title="경제일정"
                  >
                    <div className="home-search-list">
                      {results.events.map((item) => (
                        <EventCard item={item} key={item.id} locale={locale} />
                      ))}
                    </div>
                  </ResultSection>

                  <ResultSection
                    count={results.reports.length}
                    emptyText="관련 리포트가 없습니다."
                    icon={documentTextOutline}
                    title="리포트"
                  >
                    <div className="home-search-list">
                      {results.reports.map((item) => (
                        <ReportCard item={item} key={item.id} />
                      ))}
                    </div>
                  </ResultSection>
                </div>
              </>
            )}
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
}

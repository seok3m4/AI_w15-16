"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

type KboNewsArticle = {
  id: string;
  title: string;
  url: string;
  summary: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string | null;
};

type KboNewsResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: {
    source: string;
    fetchedAt: string;
    articles: KboNewsArticle[];
  };
};

type Source = {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string | null;
};

type UrlBriefing = {
  mode: "keyword" | "url";
  briefing: string;
  sources: Source[];
  toolName: string;
};

type BriefingResponse = {
  status: "ready" | "unavailable";
  message?: string;
  briefing?: UrlBriefing;
};

type NewsBriefingState = {
  isLoading: boolean;
  message: string;
  briefing?: UrlBriefing;
};

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getBackgroundStyle(imageUrl: string | null): CSSProperties | undefined {
  if (!imageUrl) {
    return undefined;
  }

  return {
    backgroundImage: `url("${imageUrl.replaceAll('"', "%22")}")`,
  };
}

async function requestKboNews(refresh = false): Promise<KboNewsResponse> {
  const params = new URLSearchParams({
    limit: "20",
  });

  if (refresh) {
    params.set("refresh", "true");
  }

  const response = await fetch(`/api/kbo/news?${params.toString()}`, {
    credentials: "include",
  });
  const responseData = (await response.json()) as KboNewsResponse;

  if (!response.ok) {
    return {
      status: "unavailable",
      message: responseData.message ?? "KBO 뉴스를 불러오지 못했습니다.",
    };
  }

  return responseData;
}

export function KboNewsPage() {
  const [data, setData] = useState<KboNewsResponse["result"] | null>(null);
  const [message, setMessage] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [briefingStates, setBriefingStates] = useState<
    Record<string, NewsBriefingState>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const filteredArticles = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    const articles = data?.articles ?? [];

    if (!keyword) {
      return articles;
    }

    return articles.filter((article) =>
      [article.title, article.summary, article.source]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [data?.articles, searchKeyword]);

  async function loadNews(refresh = false) {
    setIsLoading(true);
    setMessage("");

    try {
      const responseData = await requestKboNews(refresh);

      if (!responseData.result) {
        setData(null);
        setMessage(
          responseData.message ?? "KBO 뉴스를 불러오지 못했습니다.",
        );
        return;
      }

      setData(responseData.result);
    } catch {
      setData(null);
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateBriefing(article: KboNewsArticle) {
    setBriefingStates((currentStates) => ({
      ...currentStates,
      [article.id]: {
        isLoading: true,
        message: "",
      },
    }));

    try {
      const response = await fetch("/api/ai/mcp/briefing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mode: "url",
          input: article.url,
        }),
      });
      const responseData = (await response.json()) as BriefingResponse;

      if (!response.ok || !responseData.briefing) {
        setBriefingStates((currentStates) => ({
          ...currentStates,
          [article.id]: {
            isLoading: false,
            message:
              responseData.message ?? "URL 브리핑을 생성하지 못했습니다.",
          },
        }));
        return;
      }

      setBriefingStates((currentStates) => ({
        ...currentStates,
        [article.id]: {
          isLoading: false,
          message: "",
          briefing: responseData.briefing,
        },
      }));
    } catch {
      setBriefingStates((currentStates) => ({
        ...currentStates,
        [article.id]: {
          isLoading: false,
          message: "네트워크 연결을 확인해주세요.",
        },
      }));
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialNews() {
      try {
        const responseData = await requestKboNews();

        if (!isMounted) {
          return;
        }

        if (!responseData.result) {
          setData(null);
          setMessage(
            responseData.message ?? "KBO 뉴스를 불러오지 못했습니다.",
          );
          return;
        }

        setData(responseData.result);
      } catch {
        if (isMounted) {
          setData(null);
          setMessage("네트워크 연결을 확인해주세요.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialNews();

    return () => {
      isMounted = false;
    };
  }, []);

  function renderBriefingBlock(article: KboNewsArticle) {
    const state = briefingStates[article.id];

    return (
      <>
        {state?.briefing ? (
          <div className="border-t border-[#edf1f7] bg-[#fbfcff] px-4 py-4 sm:px-5">
            <div className="rounded-sm border border-[#d8deea] bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black text-[#667085]">URL 브리핑</p>
                <span className="rounded-sm bg-[#eef3ff] px-2 py-1 text-[11px] font-black text-[#2f4f9f]">
                  기사 요약 완료
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#202632]">
                {state.briefing.briefing}
              </p>
            </div>
            {state.briefing.sources.length ? (
              <div className="mt-3 rounded-sm border border-[#d8deea] bg-white p-3">
                <p className="text-xs font-black text-[#667085]">참고 링크</p>
                <div className="mt-2 grid gap-1.5">
                  {state.briefing.sources.map((source) => (
                    <a
                      className="text-sm font-bold text-[#2f4f9f] hover:underline"
                      href={source.url}
                      key={source.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className="page-shell">
      <div className="community-panel">
        <div className="community-page-header">
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#071a3d]">
              KBO 뉴스
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#667085]">
              최신 야구 뉴스와 기사 정리
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              className="community-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => void loadNews(true)}
              type="button"
            >
              {isLoading ? "불러오는 중" : "새로고침"}
            </button>
            <a
              className="community-button-danger"
              href={
                data?.source ??
                "https://www.koreabaseball.com/MediaNews/News/BreakingNews/List.aspx"
              }
              rel="noreferrer"
              target="_blank"
            >
              KBO 원문
            </a>
          </div>
        </div>

        {data ? (
          <div className="community-toolbar">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className="community-input w-full max-w-xl text-sm"
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="기사 제목, 출처, 요약 검색"
                  value={searchKeyword}
                />
                {searchKeyword ? (
                  <button
                    className="community-button-secondary shrink-0"
                    onClick={() => setSearchKeyword("")}
                    type="button"
                  >
                    초기화
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="community-subpanel bg-white px-3 py-2">
                  <p className="text-[11px] font-bold text-[#667085]">전체 기사</p>
                  <p className="mt-1 text-sm font-black text-[#071a3d]">
                    {data.articles.length}개
                  </p>
                </div>
                <div className="community-subpanel bg-white px-3 py-2">
                  <p className="text-[11px] font-bold text-[#667085]">표시 결과</p>
                  <p className="mt-1 text-sm font-black text-[#071a3d]">
                    {filteredArticles.length}개
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {data ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#d8deea] bg-white px-5 py-3 text-sm font-bold text-[#667085]">
            <span>{data.articles.length}개 뉴스</span>
            <span>|</span>
            <span>{formatFetchedAt(data.fetchedAt)} 조회</span>
          </div>
        ) : null}

        {message ? (
          <p className="border-b border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#b91c1c]">
            {message}
          </p>
        ) : null}

        {isLoading && !data ? (
          <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                className="overflow-hidden rounded-sm border border-[#d8deea] bg-white"
                key={`news-skeleton-${index}`}
              >
                <div className="h-40 animate-pulse bg-[#dfe7f4]" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-[#e7edf7]" />
                  <div className="h-6 w-full animate-pulse rounded bg-[#dfe7f4]" />
                  <div className="h-6 w-4/5 animate-pulse rounded bg-[#dfe7f4]" />
                  <div className="h-4 w-full animate-pulse rounded bg-[#eef3fb]" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-[#eef3fb]" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && data && filteredArticles.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-base font-black text-[#1f3470]">
              {searchKeyword ? "검색 결과가 없습니다." : "표시할 뉴스가 없습니다."}
            </h3>
            <p className="mt-2 text-sm text-[#667085]">
              {searchKeyword
                ? "검색어를 바꾸거나 초기화해서 다시 확인해주세요."
                : "잠시 후 다시 새로고침해주세요."}
            </p>
          </div>
        ) : null}
      </div>

      {filteredArticles.length ? (
        <div className="mt-4 grid gap-3">
          {filteredArticles.map((article) => {
            const state = briefingStates[article.id];

            return (
              <article
                className="community-panel transition hover:border-[#2f4f9f] hover:bg-[#fbfcff]"
                key={article.id}
              >
                <div className="grid md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_260px]">
                  <div
                    aria-hidden="true"
                    className="relative flex min-h-[160px] items-center justify-center overflow-hidden bg-[#071a3d] text-base font-black text-white"
                  >
                    {article.imageUrl ? (
                      <>
                        <div
                          className="absolute inset-0 scale-110 bg-cover bg-center opacity-35 blur-md"
                          style={getBackgroundStyle(article.imageUrl)}
                        />
                        <div
                          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                          style={getBackgroundStyle(article.imageUrl)}
                        />
                      </>
                    ) : (
                      "KBO"
                    )}
                  </div>

                  <div className="min-w-0 p-4 sm:p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-[#667085]">
                      <span>{article.source}</span>
                      {article.publishedAt ? (
                        <>
                          <span>|</span>
                          <span>{article.publishedAt}</span>
                        </>
                      ) : null}
                    </div>
                    <h2 className="line-clamp-2 text-lg font-black leading-7 text-[#202632]">
                      <a
                        className="hover:text-[#2f4f9f] hover:underline"
                        href={article.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {article.title}
                      </a>
                    </h2>
                    {article.summary ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#667085]">
                        {article.summary}
                      </p>
                    ) : null}
                  </div>

                  <div className="border-t border-[#edf1f7] bg-[#f8fafc] p-4 md:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0">
                    <div className="grid gap-2">
                      <div className="rounded-sm border border-[#d8deea] bg-white px-3 py-2 text-xs text-[#667085]">
                        <p className="font-bold">기사 활용</p>
                        <p className="mt-1 leading-5">
                          원문 확인과 요약 정리
                        </p>
                      </div>
                      <button
                        className="community-button-primary w-full"
                        disabled={state?.isLoading}
                        onClick={() => void handleCreateBriefing(article)}
                        type="button"
                      >
                        {state?.isLoading
                          ? "브리핑 중"
                          : state?.briefing
                            ? "다시 브리핑"
                            : "URL 브리핑"}
                      </button>
                      <a
                        className="community-button-secondary w-full"
                        href={article.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        원문 보기
                      </a>
                    </div>

                    {state?.message ? (
                      <p className="mt-3 rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
                        {state.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                {renderBriefingBlock(article)}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

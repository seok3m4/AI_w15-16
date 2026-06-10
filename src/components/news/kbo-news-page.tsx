"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

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

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
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

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
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
  const [copiedUrl, setCopiedUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  async function handleCopy(url: string) {
    try {
      await copyToClipboard(url);
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl(""), 1800);
    } catch {
      setMessage("URL 복사에 실패했습니다.");
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

  return (
    <section className="mx-auto max-w-7xl px-6 py-8">
      <div className="overflow-hidden rounded-md border border-[#1f3768] bg-[#071a3d] text-white shadow-[0_20px_48px_rgba(7,26,61,0.18)]">
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffb4b7]">
            KBO Official
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
            KBO 뉴스
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            KBO 공식 홈페이지의 최신 뉴스를 모아보고, 필요한 원문 URL을 바로
            복사할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void loadNews(true)}
            type="button"
          >
            {isLoading ? "불러오는 중" : "새로고침"}
          </button>
          <a
            className="rounded-md bg-[#d71920] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#a91118]"
            href={data?.source ?? "https://www.koreabaseball.com/MediaNews/News/BreakingNews/List.aspx"}
            rel="noreferrer"
            target="_blank"
          >
            KBO 원문
          </a>
        </div>
      </div>
      </div>

      {data ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-4 py-3 text-sm font-bold text-[#64748b]">
          <span>{data.articles.length}개 뉴스</span>
          <span>|</span>
          <span>{formatFetchedAt(data.fetchedAt)} 조회</span>
        </div>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {message}
        </p>
      ) : null}

      {isLoading && !data ? (
        <div className="kbo-panel mt-5 p-5 text-sm text-[#64748b]">
          KBO 뉴스를 불러오는 중입니다.
        </div>
      ) : null}

      {!isLoading && data?.articles.length === 0 ? (
        <div className="kbo-panel mt-5 p-5">
          <h3 className="text-base font-black text-[#071a3d]">
            표시할 뉴스가 없습니다.
          </h3>
          <p className="mt-2 text-sm text-[#64748b]">
            잠시 후 다시 새로고침해주세요.
          </p>
        </div>
      ) : null}

      {data?.articles.length ? (
        <div className="mt-5 grid gap-3">
          {data.articles.map((article) => (
            <article
              className="kbo-panel overflow-hidden transition hover:-translate-y-0.5 hover:border-[#c9d2e3] hover:shadow-[0_16px_38px_rgba(15,23,42,0.10)] sm:flex"
              key={article.id}
            >
              <div
                aria-hidden="true"
                className="flex aspect-[16/9] items-center justify-center bg-[#071a3d] bg-cover bg-center text-sm font-black text-white sm:w-56 sm:flex-none"
                style={getBackgroundStyle(article.imageUrl)}
              >
                {article.imageUrl ? null : "KBO"}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3 border-l-4 border-[#d71920] p-5">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-[#64748b]">
                    <span>{article.source}</span>
                    {article.publishedAt ? (
                      <>
                        <span>|</span>
                        <span>{article.publishedAt}</span>
                      </>
                    ) : null}
                  </div>
                  <h3 className="text-xl font-black leading-7 text-[#071a3d]">
                    <a
                      className="hover:text-[#d71920]"
                      href={article.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {article.title}
                    </a>
                  </h3>
                  {article.summary ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64748b]">
                      {article.summary}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md border border-[#d7dde8] bg-white px-3 py-2 text-sm font-bold text-[#071a3d] hover:border-[#d71920] hover:text-[#d71920]"
                    onClick={() => void handleCopy(article.url)}
                    type="button"
                  >
                    {copiedUrl === article.url ? "복사 완료" : "URL 복사"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

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
    <section className="mx-auto max-w-7xl px-4 py-5">
      <div className="overflow-hidden rounded-sm border border-[#b9c3d7] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#d8deea] bg-[#f6f8fc] px-5 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#1f3470]">
              KBO 뉴스
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
              KBO 공식 홈페이지의 최신 뉴스를 모아보고, 필요한 원문 URL을 바로
              복사할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              className="h-10 rounded-sm border border-[#b9c3d7] bg-white px-4 text-sm font-bold text-[#1f3470] hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => void loadNews(true)}
              type="button"
            >
              {isLoading ? "불러오는 중" : "새로고침"}
            </button>
            <a
              className="inline-flex h-10 items-center rounded-sm bg-[#2f4f9f] px-4 text-sm font-bold text-white hover:bg-[#1f3470]"
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
          <div className="px-5 py-8 text-center text-sm text-[#667085]">
            KBO 뉴스를 불러오는 중입니다.
          </div>
        ) : null}

        {!isLoading && data?.articles.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-base font-black text-[#1f3470]">
              표시할 뉴스가 없습니다.
            </h3>
            <p className="mt-2 text-sm text-[#667085]">
              잠시 후 다시 새로고침해주세요.
            </p>
          </div>
        ) : null}
      </div>

      {data?.articles.length ? (
        <div className="mt-4 grid gap-3">
          {data.articles.map((article) => (
            <article
              className="overflow-hidden rounded-sm border border-[#b9c3d7] bg-white transition hover:border-[#2f4f9f] hover:bg-[#fbfcff] md:flex md:min-h-48"
              key={article.id}
            >
              <div
                aria-hidden="true"
                className="relative flex h-48 shrink-0 items-center justify-center overflow-hidden bg-[#2f4f9f] text-base font-black text-white md:h-auto md:w-64 lg:w-72"
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

              <div className="flex min-w-0 flex-col gap-3 p-5">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-[#667085]">
                    <span>{article.source}</span>
                    {article.publishedAt ? (
                      <>
                        <span>|</span>
                        <span>{article.publishedAt}</span>
                      </>
                    ) : null}
                  </div>
                  <h2 className="text-xl font-black leading-7 text-[#202632]">
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

                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    className="h-9 rounded-sm border border-[#c8d3df] bg-[#f6f8fc] px-3 text-sm font-bold text-[#4b5563] hover:border-[#2f4f9f] hover:text-[#1f3470]"
                    onClick={() => void handleCopy(article.url)}
                    type="button"
                  >
                    {copiedUrl === article.url ? "복사 완료" : "URL 복사"}
                  </button>
                  <a
                    className="inline-flex h-9 items-center rounded-sm border border-[#c8d3df] bg-white px-3 text-sm font-bold text-[#4b5563] hover:border-[#2f4f9f] hover:text-[#1f3470]"
                    href={article.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    원문 보기
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

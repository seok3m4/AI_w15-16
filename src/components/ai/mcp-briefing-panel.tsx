"use client";

import { FormEvent, useState } from "react";

type BriefingMode = "keyword" | "url";

type Source = {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string | null;
};

type BriefingResponse = {
  status: "ready" | "unavailable";
  message?: string;
  briefing?: {
    mode: BriefingMode;
    briefing: string;
    sources: Source[];
    toolName: string;
  };
};

function getPlaceholder(mode: BriefingMode): string {
  return mode === "keyword"
    ? "예: 한화 류현진, KBO 트레이드"
    : "https://...";
}

export function McpBriefingPanel() {
  const [mode, setMode] = useState<BriefingMode>("keyword");
  const [input, setInput] = useState("");
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setData(null);

    try {
      const response = await fetch("/api/ai/mcp/briefing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mode,
          input,
        }),
      });
      const responseData = (await response.json()) as BriefingResponse;

      if (!response.ok) {
        setData({
          status: "unavailable",
          message: responseData.message ?? "브리핑을 생성하지 못했습니다.",
        });
        return;
      }

      setData(responseData);
    } catch {
      setData({
        status: "unavailable",
        message: "네트워크 연결을 확인해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="kbo-panel overflow-hidden">
      <div className="border-b border-[#d7dde8] bg-white px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d71920]">
          News Briefing
        </p>
        <h2 className="mt-1 text-base font-black text-[#071a3d]">
          뉴스/URL 브리핑
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#64748b]">
          외부 뉴스 검색이나 URL 분석 결과를 게시글 브리핑으로 정리합니다.
        </p>
      </div>

      <form className="grid gap-3 bg-[#f8fafc] p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2 rounded-md bg-[#e8edf5] p-1">
          <button
            className={`rounded-md px-3 py-2 text-sm font-bold ${
              mode === "keyword"
                ? "bg-white text-[#d71920] shadow-sm"
                : "text-[#64748b]"
            }`}
            onClick={() => setMode("keyword")}
            type="button"
          >
            키워드
          </button>
          <button
            className={`rounded-md px-3 py-2 text-sm font-bold ${
              mode === "url"
                ? "bg-white text-[#d71920] shadow-sm"
                : "text-[#64748b]"
            }`}
            onClick={() => setMode("url")}
            type="button"
          >
            URL
          </button>
        </div>

        <input
          className="h-10 rounded-md border border-[#c8d3df] bg-white px-3 text-sm outline-none focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/10"
          onChange={(event) => setInput(event.target.value)}
          placeholder={getPlaceholder(mode)}
          type={mode === "url" ? "url" : "text"}
          value={input}
        />

        <button
          className="h-10 rounded-md bg-[#071a3d] px-4 text-sm font-bold text-white hover:bg-[#102a56] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading || input.trim().length < 2}
          type="submit"
        >
          {isLoading ? "브리핑 생성 중" : "브리핑 생성"}
        </button>
      </form>

      {data?.message ? (
        <p className="mx-5 mt-4 rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {data?.briefing ? (
        <div className="space-y-4 p-5 pt-4">
          <div className="rounded-md border border-[#d7dde8] bg-[#f8fafc] p-3">
            <p className="text-xs font-black uppercase text-[#64748b]">
              브리핑
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#071a3d]">
              {data.briefing.briefing}
            </p>
          </div>

          {data.briefing.sources.length > 0 ? (
            <div>
              <p className="text-xs font-black uppercase text-[#64748b]">
                외부 출처
              </p>
              <div className="mt-2 grid gap-2">
                {data.briefing.sources.map((source) => (
                  <a
                    className="rounded-md border border-[#d7dde8] bg-white p-3 text-sm hover:border-[#d71920]"
                    href={source.url}
                    key={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="block font-black text-[#071a3d]">
                      {source.title}
                    </span>
                    {source.source ? (
                      <span className="mt-1 block text-xs text-[#64748b]">
                        {source.source}
                      </span>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

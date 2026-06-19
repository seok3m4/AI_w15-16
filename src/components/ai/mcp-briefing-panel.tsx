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
          message: responseData.message ?? "뉴스를 정리하지 못했습니다.",
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
    <section className="community-panel overflow-hidden">
      <div className="community-panel-header">
        <div>
          <p className="text-[11px] font-black tracking-[0.12em] text-[#d71920]">
            뉴스 정리
          </p>
          <h2 className="mt-1 text-base font-black text-[#071a3d]">
            뉴스 링크 정리
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-[#667085]">
            키워드나 기사 링크를 넣으면 핵심만 정리합니다.
          </p>
        </div>
        <span className="community-chip community-chip-link">기사 정리</span>
      </div>

      <form className="grid gap-3 p-4" onSubmit={handleSubmit}>
        <div className="community-segmented">
          <button
            className="community-segment-button"
            data-active={mode === "keyword"}
            onClick={() => setMode("keyword")}
            type="button"
          >
            키워드
          </button>
          <button
            className="community-segment-button"
            data-active={mode === "url"}
            onClick={() => setMode("url")}
            type="button"
          >
            URL
          </button>
        </div>

        <input
          className="community-input text-sm"
          onChange={(event) => setInput(event.target.value)}
          placeholder={getPlaceholder(mode)}
          type={mode === "url" ? "url" : "text"}
          value={input}
        />

        <button
          className="community-button-primary px-4 disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading || input.trim().length < 2}
          type="submit"
        >
          {isLoading ? "정리 중" : "정리하기"}
        </button>
      </form>

      {data?.message ? (
        <p className="mx-4 mt-1 rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {data?.briefing ? (
        <div className="space-y-4 p-4 pt-1">
          <div className="community-subpanel p-3">
            <p className="text-xs font-black uppercase text-[#64748b]">
              정리 내용
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
                    className="community-subpanel bg-white p-3 text-sm hover:border-[#2f4f9f] hover:bg-[#fbfcff]"
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

"use client";

import { useState } from "react";

type SourcePost = {
  id: string;
  title: string;
  counts: {
    comments: number;
    views: number;
    voteScore: number;
  };
  tags: {
    id: string;
    name: string;
  }[];
};

type SummaryResponse = {
  status: "ready" | "disabled" | "unavailable" | "not_found";
  message?: string;
  summary: string | null;
  sources: SourcePost[];
};

type RelatedPostSummaryPanelProps = {
  title: string;
  description: string;
  tags: string[];
};

export function RelatedPostSummaryPanel({
  title,
  description,
  tags,
}: RelatedPostSummaryPanelProps) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  async function handleCreateSummary() {
    setIsLoading(true);
    setHasRequested(true);
    setData(null);

    try {
      const response = await fetch("/api/ai/rag/related-post-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          tags,
          limit: 5,
        }),
      });
      const responseData = (await response.json()) as SummaryResponse;

      setData(responseData);
    } catch {
      setData({
        status: "unavailable",
        message: "관련 글 요약을 생성하지 못했습니다.",
        summary: null,
        sources: [],
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="border-b border-[#edf1f7] bg-[#fbfcff]">
      <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black text-[#1f3470]">
            관련 글을 한 번에 보기
          </p>
          <p className="mt-1 text-xs leading-5 text-[#667085]">
            아래 게시글들을 경기 흐름과 쟁점 중심으로 짧게 정리합니다.
          </p>
        </div>
        <button
          className="h-9 rounded-sm bg-[#2f4f9f] px-3 text-xs font-black text-white hover:bg-[#1f3470] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading || tags.length === 0}
          onClick={() => void handleCreateSummary()}
          type="button"
        >
          {isLoading ? "요약 중" : hasRequested ? "다시 요약" : "관련 글 요약하기"}
        </button>
      </div>

      {!hasRequested ? (
        <p className="px-3 pb-3 text-xs text-[#667085]">
          버튼을 누르면 이 경기와 연결된 게시글들을 읽고 요약합니다.
        </p>
      ) : null}

      {isLoading ? (
        <p className="px-3 pb-3 text-sm text-[#667085]">
          관련 글을 읽고 요약하는 중입니다.
        </p>
      ) : null}

      {!isLoading && data?.message ? (
        <p className="mx-3 mt-3 rounded-sm border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
          {data.message}
        </p>
      ) : null}

      {!isLoading && data?.summary ? (
        <div className="px-3 pb-3">
          <div className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#202632]">
              {data.summary}
            </p>
          </div>
        </div>
      ) : null}

    </div>
  );
}

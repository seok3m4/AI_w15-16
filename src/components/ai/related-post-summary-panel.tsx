"use client";

import Link from "next/link";
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
            같은 경기 글의 흐름과 쟁점
          </p>
        </div>
        <button
          className="community-button-primary community-button-compact shrink-0"
          disabled={isLoading || tags.length === 0}
          onClick={() => void handleCreateSummary()}
          type="button"
        >
          {isLoading ? "요약 중" : hasRequested ? "다시 요약" : "관련 글 요약하기"}
        </button>
      </div>

      {!hasRequested ? (
        <p className="px-3 pb-3 text-xs text-[#667085]">
          같은 경기 태그의 글을 묶어 봅니다.
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

          {data.sources.length > 0 ? (
            <div className="mt-3 rounded-sm border border-[#d8deea] bg-white">
              <div className="border-b border-[#edf1f7] bg-[#f8fafc] px-3 py-2">
                <p className="text-xs font-black text-[#667085]">
                  요약에 반영된 글 {data.sources.length}개
                </p>
              </div>
              <div className="divide-y divide-[#edf1f7]">
                {data.sources.map((post) => (
                  <Link
                    className="block px-3 py-3 hover:bg-[#fbfcff]"
                    href={`/posts/${post.id}`}
                    key={post.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-[#202632]">
                        {post.title}
                      </p>
                      <span className="shrink-0 text-xs font-black text-[#d71920]">
                        {post.counts.views}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#667085]">
                      <span>댓글 {post.counts.comments}</span>
                      <span>·</span>
                      <span>추천 {post.counts.voteScore}</span>
                      {post.tags.length > 0 ? (
                        <>
                          <span>·</span>
                          <span className="truncate">
                            {post.tags
                              .slice(0, 3)
                              .map((tag) => `#${tag.name}`)
                              .join(" ")}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

    </div>
  );
}

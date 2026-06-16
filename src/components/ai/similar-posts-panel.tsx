"use client";

import Link from "next/link";
import { useState } from "react";

type Tag = {
  id: string;
  name: string;
};

type SimilarPost = {
  id: string;
  title: string;
  content: string;
  tags: Tag[];
  similarity: number;
};

type SimilarPostsResponse = {
  status: "ready" | "disabled" | "unavailable" | "not_found";
  message?: string;
  summary: string | null;
  similarPosts: SimilarPost[];
};

type SimilarPostsPanelProps = {
  postId: string;
  className?: string;
};

function formatSimilarity(value: number): string {
  const percent = Math.round(Math.max(0, Math.min(value, 1)) * 100);

  return `${percent}%`;
}

function getPreview(content: string): string {
  return content.length > 96 ? `${content.slice(0, 96)}...` : content;
}

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function SimilarPostsPanel({
  postId,
  className,
}: SimilarPostsPanelProps) {
  const [data, setData] = useState<SimilarPostsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  async function handleLoadSimilarPosts() {
    setIsLoading(true);
    setHasRequested(true);
    setData(null);

    try {
      const response = await fetch(
        `/api/ai/rag/similar-posts?postId=${encodeURIComponent(postId)}`,
        {
          credentials: "include",
        },
      );
      const responseData = (await response.json()) as SimilarPostsResponse;

      setData(responseData);
    } catch {
      setData({
        status: "unavailable",
        message: "유사 게시글 추천을 불러오지 못했습니다.",
        summary: null,
        similarPosts: [],
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={joinClassNames("community-panel min-w-0", className)}>
      <div className="community-panel-header">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-[#071a3d]">비슷한 글</h3>
          <p className="mt-0.5 text-[11px] text-[#667085]">
            현재 글과 비슷한 주제의 다른 게시글을 찾아봅니다.
          </p>
        </div>
        <button
          className="community-button-primary community-button-compact w-full justify-center disabled:cursor-not-allowed disabled:bg-[#94a3b8] sm:w-auto"
          disabled={isLoading}
          onClick={handleLoadSimilarPosts}
          type="button"
        >
          {isLoading
            ? "찾는 중"
            : hasRequested
              ? "다시 찾기"
              : "유사 글 찾기"}
        </button>
      </div>

      {isLoading ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          유사 게시글을 찾는 중입니다.
        </p>
      ) : null}

      {!hasRequested ? (
        <p className="px-3 py-4 text-sm leading-6 text-[#667085]">
          비슷한 경기 이야기와 같은 쟁점의 글을 찾습니다.
        </p>
      ) : null}

      {!isLoading && data?.message ? (
        <p className="mx-3 mt-3 rounded-sm border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
          {data.message}
        </p>
      ) : null}

      {!isLoading && data?.summary ? (
        <div className="mx-3 mt-3 rounded-sm border border-[#d8deea] bg-[#f8fafc] p-3">
          <p className="text-xs font-black text-[#667085]">요약</p>
          <p className="mt-2 text-sm leading-6 text-[#202632]">
            {data.summary}
          </p>
        </div>
      ) : null}

      {!isLoading &&
      data?.status === "ready" &&
      data.similarPosts.length === 0 ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          아직 비교할 수 있는 다른 게시글이 없습니다.
        </p>
      ) : null}

      {!isLoading && data && data.similarPosts.length > 0 ? (
        <div className="grid gap-3 px-3 py-3">
          {data.similarPosts.map((post) => (
            <article
              className="min-w-0 rounded-sm border border-[#d8deea] bg-[#fbfcfd] p-4"
              key={post.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  className="min-w-0 flex-1 break-words font-bold text-[#202632] hover:text-[#2f4f9f]"
                  href={`/posts/${post.id}`}
                >
                  {post.title}
                </Link>
                <span className="rounded-sm bg-[#eef3ff] px-2 py-1 text-xs font-black text-[#2f4f9f]">
                  유사도 {formatSimilarity(post.similarity)}
                </span>
              </div>

              <p className="mt-2 break-words text-sm leading-6 text-[#667085]">
                {getPreview(post.content)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.length > 0 ? (
                  post.tags.map((tag) => (
                    <span
                      className="rounded-sm bg-white px-2 py-1 text-xs font-semibold text-[#667085]"
                      key={tag.id}
                    >
                      #{tag.name}
                    </span>
                  ))
                ) : (
                  <span className="rounded-sm bg-white px-2 py-1 text-xs font-semibold text-[#667085]">
                    태그 없음
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

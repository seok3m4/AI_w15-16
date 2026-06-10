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
};

function formatSimilarity(value: number): string {
  const percent = Math.round(Math.max(0, Math.min(value, 1)) * 100);

  return `${percent}%`;
}

function getPreview(content: string): string {
  return content.length > 96 ? `${content.slice(0, 96)}...` : content;
}

export function SimilarPostsPanel({ postId }: SimilarPostsPanelProps) {
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
    <section className="mt-5 rounded-md border border-[#d9e2ec] bg-white p-5">
      <div className="flex flex-col gap-3 border-b border-[#d9e2ec] pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI 유사 게시글 추천</h3>
          <p className="mt-1 text-sm text-[#5e6a7d]">
            궁금할 때만 현재 글과 주제가 가까운 야구 게시글을 찾아봅니다.
          </p>
        </div>
        <button
          className="h-10 rounded-md bg-[#172033] px-4 text-sm font-semibold text-white hover:bg-[#2b3548] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading}
          onClick={handleLoadSimilarPosts}
          type="button"
        >
          {isLoading
            ? "찾는 중"
            : hasRequested
              ? "다시 찾기"
              : "유사 게시글 찾기"}
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-[#5e6a7d]">
          유사 게시글을 찾는 중입니다.
        </p>
      ) : null}

      {!hasRequested ? (
        <p className="mt-4 text-sm leading-6 text-[#5e6a7d]">
          버튼을 누르면 비슷한 주제의 관련 글을 찾습니다.
        </p>
      ) : null}

      {!isLoading && data?.message ? (
        <p className="mt-4 rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
          {data.message}
        </p>
      ) : null}

      {!isLoading && data?.summary ? (
        <div className="mt-4 rounded-md bg-[#eef4f7] p-3">
          <p className="text-xs font-semibold uppercase text-[#5e6a7d]">
            요약
          </p>
          <p className="mt-2 text-sm leading-6 text-[#172033]">
            {data.summary}
          </p>
        </div>
      ) : null}

      {!isLoading && data?.status === "ready" && data.similarPosts.length === 0 ? (
        <p className="mt-4 text-sm text-[#5e6a7d]">
          아직 비교할 수 있는 다른 게시글이 없습니다.
        </p>
      ) : null}

      {!isLoading && data && data.similarPosts.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {data.similarPosts.map((post) => (
            <article
              className="rounded-md border border-[#d9e2ec] bg-[#fbfcfd] p-4"
              key={post.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  className="font-semibold text-[#172033] hover:text-[#0f766e]"
                  href={`/posts/${post.id}`}
                >
                  {post.title}
                </Link>
                <span className="rounded-md bg-[#e6f4f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                  유사도 {formatSimilarity(post.similarity)}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-[#5e6a7d]">
                {getPreview(post.content)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.length > 0 ? (
                  post.tags.map((tag) => (
                    <span
                      className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#5e6a7d]"
                      key={tag.id}
                    >
                      #{tag.name}
                    </span>
                  ))
                ) : (
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#5e6a7d]">
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

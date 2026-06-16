"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Post = {
  id: string;
  title: string;
  createdAt: string;
  author: {
    nickname: string;
  };
  counts: {
    comments: number;
    views: number;
  };
};

type PostsResponse = {
  posts?: Post[];
  message?: string;
};

type HotPostsPanelProps = {
  selectedTeam: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function HotPostsPanel({ selectedTeam }: HotPostsPanelProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "10",
      sort: "views",
    });

    if (selectedTeam) {
      params.set("tag", selectedTeam);
    }

    return params.toString();
  }, [selectedTeam]);

  useEffect(() => {
    let isMounted = true;

    async function loadHotPosts() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`/api/posts?${queryString}`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await response.json()) as PostsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.posts) {
          setPosts([]);
          setMessage(data.message ?? "인기글을 불러오지 못했습니다.");
          return;
        }

        setPosts(data.posts.slice(0, 6));
      } catch {
        if (isMounted) {
          setPosts([]);
          setMessage("인기글을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHotPosts();

    return () => {
      isMounted = false;
    };
  }, [queryString]);

  return (
    <section className="community-panel">
      <div className="community-panel-header">
        <div>
          <h2 className="text-sm font-black text-[#1f3470]">
            {selectedTeam ? `${selectedTeam} 인기글` : "인기글"}
          </h2>
          <p className="mt-0.5 text-[11px] text-[#667085]">
            지금 많이 보는 글
          </p>
        </div>
        <span className="text-[11px] font-black text-[#d71920]">조회순</span>
      </div>

      {isLoading ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          인기글을 불러오는 중입니다.
        </p>
      ) : null}

      {!isLoading && message ? (
        <p className="px-3 py-4 text-sm text-[#b91c1c]">{message}</p>
      ) : null}

      {!isLoading && !message && posts.length === 0 ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          아직 보여줄 글이 없습니다.
        </p>
      ) : null}

      {!isLoading && posts.length > 0 ? (
        <div className="divide-y divide-[#edf1f7]">
          {posts.map((post, index) => (
            <Link
              className="block px-3 py-3 hover:bg-[#f8fafc]"
              href={`/posts/${post.id}`}
              key={post.id}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#eef3ff] text-[11px] font-black text-[#2f4f9f]">
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 break-words text-sm font-bold leading-5 text-[#202632]">
                  {post.title}
                </p>
                <span className="shrink-0 rounded-sm bg-[#f6f8fc] px-2 py-1 text-[11px] font-black text-[#2f4f9f]">
                  조회 {post.counts.views}
                </span>
              </div>
              <p className="mt-2 pl-7 text-xs text-[#8a94a6]">
                {post.author.nickname} · 댓글 {post.counts.comments} ·{" "}
                {formatDate(post.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

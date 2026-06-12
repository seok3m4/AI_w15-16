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
    <section className="overflow-hidden rounded-sm border border-[#b9c3d7] bg-white">
      <div className="border-b border-[#d8deea] bg-[#f6f8fc] px-3 py-2">
        <h2 className="text-sm font-black text-[#1f3470]">
          {selectedTeam ? `${selectedTeam} 인기글` : "인기글"}
        </h2>
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
              className="block px-3 py-2.5 hover:bg-[#f8fafc]"
              href={`/posts/${post.id}`}
              key={post.id}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs font-black text-[#d71920]">
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#202632]">
                  {post.title}
                </p>
                <span className="shrink-0 text-xs font-black text-[#d71920]">
                  {post.counts.views}
                </span>
              </div>
              <p className="mt-1 truncate pl-7 text-xs text-[#8a94a6]">
                {post.author.nickname} · 조회 {post.counts.views} · 댓글{" "}
                {post.counts.comments} · {formatDate(post.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
};

type Tag = {
  id: string;
  name: string;
};

type Post = {
  id: string;
  title: string;
  content: string;
  author: CurrentUser;
  tags: Tag[];
  createdAt: string;
  counts: {
    comments: number;
    tags: number;
  };
};

type PostsResponse = {
  posts: Post[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: {
    q: string;
    tags: string[];
  };
};

type AuthMeResponse = {
  user?: CurrentUser;
};

type PostListProps = {
  page: number;
  selectedTags: string[];
  onPageChange: (page: number) => void;
  onToggleTag: (tagName: string) => void;
  onClearTags: () => void;
};

const PAGE_SIZE = 5;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPreview(content: string): string {
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

export function PostList({
  page,
  selectedTags,
  onPageChange,
  onToggleTag,
  onClearTags,
}: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PostsResponse["pagination"]>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    if (searchQuery) {
      params.set("q", searchQuery);
    }

    selectedTags.forEach((tagName) => {
      params.append("tag", tagName);
    });

    return params.toString();
  }, [page, searchQuery, selectedTags]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setCurrentUser(null);
        return;
      }

      const data = (await response.json()) as AuthMeResponse;
      setCurrentUser(data.user ?? null);
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`/api/posts?${queryString}`, {
          credentials: "include",
        });
        const data = (await response.json()) as Partial<PostsResponse> & {
          message?: string;
        };

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.posts || !data.pagination) {
          setMessage(data.message ?? "게시글을 불러오지 못했습니다.");
          setPosts([]);
          return;
        }

        setPosts(data.posts);
        setPagination(data.pagination);
      } catch {
        if (isMounted) {
          setMessage("네트워크 연결을 확인해주세요.");
          setPosts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, [queryString]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
    onPageChange(1);
  }

  function handleResetFilters() {
    setSearchInput("");
    setSearchQuery("");
    onClearTags();
    onPageChange(1);
  }

  function handleSelectTag(tagName: string) {
    onToggleTag(tagName);
    onPageChange(1);
  }

  const hasActiveFilter = Boolean(searchQuery || selectedTags.length > 0);

  return (
    <section className="space-y-4">
      <div className="kbo-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#d7dde8] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d71920]">
            Board
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#071a3d]">
            최신 야구 게시글
          </h2>
          <p className="mt-1 text-sm text-[#64748b]">
            경기 리뷰, 선수 분석, 팀 이슈를 한곳에서 기록하고 나눕니다.
          </p>
        </div>
        {currentUser ? (
          <Link
            className="rounded-md bg-[#d71920] px-4 py-2 text-center text-sm font-bold text-white shadow-sm hover:bg-[#a91118]"
            href="/posts/new"
          >
            새 글 작성
          </Link>
        ) : (
          <Link
            className="rounded-md border border-[#d7dde8] bg-[#f8fafc] px-4 py-2 text-center text-sm font-bold text-[#071a3d] hover:border-[#d71920] hover:text-[#d71920]"
            href="/login"
          >
            로그인 후 작성
          </Link>
        )}
      </div>

      <form className="flex flex-col gap-2 bg-[#f8fafc] px-5 py-4 sm:flex-row" onSubmit={handleSearch}>
        <input
          className="h-11 flex-1 rounded-md border border-[#c8d3df] bg-white px-3 text-sm outline-none focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/10"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="게시글 검색"
          type="search"
          value={searchInput}
        />
        <button
          className="h-11 rounded-md bg-[#071a3d] px-5 text-sm font-bold text-white hover:bg-[#102a56]"
          type="submit"
        >
          검색
        </button>
        {hasActiveFilter ? (
          <button
            className="h-11 rounded-md border border-[#c8d3df] bg-white px-4 text-sm font-bold text-[#64748b] hover:border-[#d71920] hover:text-[#d71920]"
            onClick={handleResetFilters}
            type="button"
          >
            초기화
          </button>
        ) : null}
      </form>
      </div>

      {hasActiveFilter ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-4 py-3 text-sm text-[#64748b] shadow-sm">
          <span className="font-bold text-[#071a3d]">필터</span>
          {searchQuery ? (
            <span className="rounded-md bg-[#eef2f7] px-2.5 py-1">
              검색어: {searchQuery}
            </span>
          ) : null}
          {selectedTags.map((tagName) => (
            <button
              className="rounded-md bg-[#fff1f2] px-2.5 py-1 font-bold text-[#d71920] hover:bg-[#ffe4e6]"
              key={tagName}
              onClick={() => handleSelectTag(tagName)}
              type="button"
            >
              태그: #{tagName}
            </button>
          ))}
          <span>{pagination.total}개 결과</span>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <div className="kbo-panel p-5 text-sm text-[#64748b]">
          게시글을 불러오는 중입니다.
        </div>
      ) : null}

      {!isLoading && posts.length === 0 ? (
        <div className="kbo-panel p-6">
          <h3 className="text-base font-black text-[#071a3d]">게시글이 없습니다.</h3>
          <p className="mt-2 text-sm text-[#64748b]">
            검색 조건을 바꾸거나 첫 경기 리뷰를 작성해보세요.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3">
        {posts.map((post) => (
          <article
            className="kbo-panel overflow-hidden transition hover:-translate-y-0.5 hover:border-[#c9d2e3] hover:shadow-[0_16px_38px_rgba(15,23,42,0.10)]"
            key={post.id}
          >
            <div className="border-l-4 border-[#d71920] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {post.tags.length > 0 ? (
                  post.tags.map((tag) => (
                    <button
                      className="rounded-md bg-[#eef2f7] px-2.5 py-1 text-xs font-bold text-[#102a56] hover:bg-[#fff1f2] hover:text-[#d71920]"
                      key={tag.id}
                      onClick={() => handleSelectTag(tag.name)}
                      type="button"
                    >
                      #{tag.name}
                    </button>
                  ))
                ) : (
                  <span className="rounded-md bg-[#eef2f7] px-2.5 py-1 text-xs font-bold text-[#64748b]">
                    태그 없음
                  </span>
                )}
              </div>
              <span className="rounded-md bg-[#071a3d] px-2.5 py-1 text-xs font-bold text-white">
                댓글 {post.counts.comments}개
              </span>
            </div>
            <h3 className="text-xl font-black leading-7 text-[#071a3d]">
              <Link className="hover:text-[#d71920]" href={`/posts/${post.id}`}>
                {post.title}
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              {getPreview(post.content)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[#64748b]">
              <span>{post.author.nickname}</span>
              <span>|</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-[#d7dde8] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-bold text-[#64748b]">
          총 {pagination.total}개 · {pagination.page} /{" "}
          {Math.max(pagination.totalPages, 1)} 페이지
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-[#c8d3df] bg-white px-3 py-2 text-sm font-bold text-[#64748b] hover:border-[#d71920] hover:text-[#d71920] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!pagination.hasPreviousPage}
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            type="button"
          >
            이전
          </button>
          <button
            className="rounded-md border border-[#c8d3df] bg-white px-3 py-2 text-sm font-bold text-[#64748b] hover:border-[#d71920] hover:text-[#d71920] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!pagination.hasNextPage}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            다음
          </button>
        </div>
      </div>
    </section>
  );
}

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

const PAGE_SIZE = 15;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPrimaryTag(tags: Tag[]): string {
  return tags[0]?.name ?? "자유";
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
          cache: "no-store",
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
    <section className="space-y-2">
      <div className="overflow-hidden rounded-sm border border-[#b9c3d7] bg-white">
        <div className="flex flex-col gap-2 border-b border-[#d8deea] bg-[#f6f8fc] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-[#1f3470]">전체글</h2>
            <p className="mt-0.5 text-xs text-[#667085]">
              총 {pagination.total}개 글
            </p>
          </div>
          {currentUser ? (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-sm bg-[#2f4f9f] px-4 text-sm font-bold text-white hover:bg-[#1f3470]"
              href="/posts/new"
            >
              글쓰기
            </Link>
          ) : (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-sm border border-[#b9c3d7] bg-white px-4 text-sm font-bold text-[#1f3470] hover:bg-[#eef3ff]"
              href="/login"
            >
              로그인 후 글쓰기
            </Link>
          )}
        </div>

        <form
          className="grid gap-2 border-b border-[#d8deea] bg-white px-3 py-2 sm:grid-cols-[minmax(0,1fr)_72px_72px]"
          onSubmit={handleSearch}
        >
          <input
            className="h-9 rounded-sm border border-[#c8d3df] bg-white px-3 text-sm outline-none focus:border-[#2f4f9f] focus:ring-2 focus:ring-[#2f4f9f]/10"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="제목 또는 내용을 검색하세요"
            type="search"
            value={searchInput}
          />
          <button
            className="h-9 rounded-sm bg-[#2f4f9f] text-sm font-bold text-white hover:bg-[#1f3470]"
            type="submit"
          >
            검색
          </button>
          <button
            className="h-9 rounded-sm border border-[#c8d3df] bg-[#f6f8fc] text-sm font-bold text-[#4b5563] hover:border-[#2f4f9f] hover:text-[#1f3470] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!hasActiveFilter}
            onClick={handleResetFilters}
            type="button"
          >
            초기화
          </button>
        </form>

        {hasActiveFilter ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-xs text-[#667085]">
            <span className="font-bold text-[#1f3470]">필터</span>
            {searchQuery ? (
              <span className="rounded-sm border border-[#d8deea] bg-white px-2 py-1">
                검색어: {searchQuery}
              </span>
            ) : null}
            {selectedTags.map((tagName) => (
              <button
                className="rounded-sm border border-[#b9c3d7] bg-white px-2 py-1 font-bold text-[#2f4f9f] hover:bg-[#eef3ff]"
                key={tagName}
                onClick={() => handleSelectTag(tagName)}
                type="button"
              >
                #{tagName}
              </button>
            ))}
            <span>{pagination.total}개 결과</span>
          </div>
        ) : null}

        {message ? (
          <p className="border-b border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
            {message}
          </p>
        ) : null}

        {isLoading ? (
          <div className="px-3 py-6 text-center text-sm text-[#667085]">
            게시글을 불러오는 중입니다.
          </div>
        ) : null}

        {!isLoading && posts.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <h3 className="text-base font-black text-[#1f3470]">
              게시글이 없습니다.
            </h3>
            <p className="mt-2 text-sm text-[#667085]">
              검색 조건을 바꾸거나 첫 경기 리뷰를 작성해보세요.
            </p>
          </div>
        ) : null}

        {!isLoading && posts.length > 0 ? (
          <div>
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="border-b border-[#d8deea] bg-[#f6f8fc] text-xs font-bold text-[#667085]">
                <tr>
                  <th className="hidden w-12 px-2 py-2 text-center sm:table-cell">
                    번호
                  </th>
                  <th className="w-20 px-2 py-2 text-center">말머리</th>
                  <th className="px-2 py-2 text-left">제목</th>
                  <th className="hidden w-20 px-2 py-2 text-center md:table-cell">
                    글쓴이
                  </th>
                  <th className="hidden w-24 px-2 py-2 text-center md:table-cell">
                    작성일
                  </th>
                  <th className="w-12 px-2 py-2 text-center">댓글</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, index) => {
                  const postNumber =
                    pagination.total - (page - 1) * PAGE_SIZE - index;

                  return (
                    <tr
                      className="border-b border-[#edf1f7] align-middle hover:bg-[#f8fafc]"
                      key={post.id}
                    >
                      <td className="hidden px-2 py-2 text-center text-xs text-[#8a94a6] sm:table-cell">
                        {postNumber}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          className="max-w-full truncate rounded-sm border border-[#d8deea] bg-[#f6f8fc] px-2 py-1 text-xs font-bold text-[#2f4f9f] hover:border-[#2f4f9f] hover:bg-[#eef3ff]"
                          onClick={() => handleSelectTag(getPrimaryTag(post.tags))}
                          type="button"
                        >
                          {getPrimaryTag(post.tags)}
                        </button>
                      </td>
                      <td className="min-w-0 px-2 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Link
                            className="min-w-0 truncate font-bold text-[#202632] hover:text-[#2f4f9f] hover:underline"
                            href={`/posts/${post.id}`}
                          >
                            {post.title}
                          </Link>
                          {post.counts.comments > 0 ? (
                            <span className="shrink-0 text-xs font-bold text-[#d71920]">
                              [{post.counts.comments}]
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                          <span className="text-xs text-[#8a94a6]">
                            {post.author.nickname}
                          </span>
                          <span className="text-xs text-[#8a94a6]">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-2 py-2 text-center text-xs font-bold text-[#4b5563] md:table-cell">
                        {post.author.nickname}
                      </td>
                      <td className="hidden px-2 py-2 text-center text-xs text-[#667085] md:table-cell">
                        {formatDate(post.createdAt)}
                      </td>
                      <td className="px-2 py-2 text-center text-xs font-bold text-[#d71920]">
                        {post.counts.comments}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-sm border border-[#b9c3d7] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-bold text-[#667085]">
          총 {pagination.total}개 · {pagination.page} /{" "}
          {Math.max(pagination.totalPages, 1)} 페이지
        </span>
        <div className="flex items-center gap-1.5">
          <button
            className="h-8 rounded-sm border border-[#c8d3df] bg-[#f6f8fc] px-3 text-xs font-bold text-[#4b5563] hover:border-[#2f4f9f] hover:text-[#1f3470] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!pagination.hasPreviousPage}
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            type="button"
          >
            이전
          </button>
          <button
            className="h-8 rounded-sm border border-[#c8d3df] bg-[#f6f8fc] px-3 text-xs font-bold text-[#4b5563] hover:border-[#2f4f9f] hover:text-[#1f3470] disabled:cursor-not-allowed disabled:opacity-40"
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

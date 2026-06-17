"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { getPostPreviewText } from "@/lib/posts/content";

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
    views: number;
    voteScore: number;
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
  selectedTeam?: string;
  onPageChange: (page: number) => void;
  onToggleTag: (tagName: string) => void;
  onClearTags: () => void;
  onClearFilters?: () => void;
  onSelectTeam?: (teamName: string) => void;
};

const PAGE_SIZE = 20;

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

function getPostPreview(content: string): string {
  return getPostPreviewText(content);
}

function renderTagButton(
  tagName: string,
  onClick: () => void,
  variant: "primary" | "secondary" = "secondary",
) {
  return (
    <button
      className={
        variant === "primary"
          ? "community-chip community-chip-compact community-chip-link"
          : "community-chip community-chip-compact"
      }
      onClick={onClick}
      type="button"
    >
      #{tagName}
    </button>
  );
}

export function PostList({
  page,
  selectedTags,
  selectedTeam = "",
  onPageChange,
  onToggleTag,
  onClearTags,
  onClearFilters,
  onSelectTeam,
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
  const [expandedTagPostIds, setExpandedTagPostIds] = useState<string[]>([]);

  const effectiveTags = useMemo(() => {
    const tagNames: string[] = [];
    const tagKeys = new Set<string>();

    [...selectedTags, selectedTeam].forEach((tagName) => {
      const normalizedTagName = tagName.trim();
      const tagKey = normalizedTagName.toLowerCase();

      if (normalizedTagName && !tagKeys.has(tagKey)) {
        tagNames.push(normalizedTagName);
        tagKeys.add(tagKey);
      }
    });

    return tagNames;
  }, [selectedTags, selectedTeam]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    if (searchQuery) {
      params.set("q", searchQuery);
    }

    effectiveTags.forEach((tagName) => {
      params.append("tag", tagName);
    });

    return params.toString();
  }, [effectiveTags, page, searchQuery]);

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
    if (onClearFilters) {
      onClearFilters();
    } else {
      onClearTags();
    }
    onPageChange(1);
  }

  function handleSelectTag(tagName: string) {
    onToggleTag(tagName);
    onPageChange(1);
  }

  function handleTogglePostTags(postId: string) {
    setExpandedTagPostIds((currentIds) =>
      currentIds.includes(postId)
        ? currentIds.filter((currentId) => currentId !== postId)
        : [...currentIds, postId],
    );
  }

  const hasActiveFilter = Boolean(
    searchQuery || selectedTags.length > 0 || selectedTeam,
  );

  return (
    <section className="space-y-3">
      <div className="community-panel">
        <div className="community-panel-header">
          <div>
            <h2 className="text-sm font-black text-[#071a3d]">게시판</h2>
            <p className="mt-0.5 text-xs text-[#667085]">
              {selectedTeam
                ? `${selectedTeam} 게시판 · ${pagination.total}개 글`
                : `최신 글 ${pagination.total}개`}
            </p>
          </div>
          {currentUser ? (
            <Link
              className="community-button-primary community-button-compact px-4"
              href="/posts/new"
            >
              글쓰기
            </Link>
          ) : (
            <Link
              className="community-button-secondary community-button-compact px-4"
              href="/login"
            >
              로그인 후 글쓰기
            </Link>
          )}
        </div>

        <div className="border-b border-[#d8deea] bg-[#f6f8fc] px-3 py-2">
          <form
            className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_72px_72px]"
            onSubmit={handleSearch}
          >
            <input
              className="community-input community-input-compact"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="제목 또는 내용을 검색하세요"
              type="search"
              value={searchInput}
            />
            <button
              className="community-button-primary community-button-compact"
              type="submit"
            >
              검색
            </button>
            <button
              className="community-button-secondary community-button-compact disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!hasActiveFilter}
              onClick={handleResetFilters}
              type="button"
            >
              초기화
            </button>
          </form>

          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] font-bold text-[#667085]">
            <span className="rounded-sm bg-white px-2 py-0.5">
              {selectedTeam ? `${selectedTeam} 게시판` : "전체 게시판"}
            </span>
            <span className="rounded-sm bg-white px-2 py-0.5">
              페이지 {pagination.page} / {Math.max(pagination.totalPages, 1)}
            </span>
            <span className="rounded-sm bg-white px-2 py-0.5">
              태그 {selectedTags.length}개
            </span>
          </div>
        </div>

        {hasActiveFilter ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#d8deea] bg-[#fbfcff] px-3 py-1.5 text-xs text-[#667085]">
            <span className="font-bold text-[#1f3470]">필터</span>
            {searchQuery ? (
              <span className="community-chip community-chip-compact">
                검색어: {searchQuery}
              </span>
            ) : null}
            {selectedTeam ? (
              <button
                className="community-chip community-chip-compact community-chip-dark"
                onClick={() => onSelectTeam?.("")}
                type="button"
              >
                팀: {selectedTeam}
              </button>
            ) : null}
            {selectedTags.map((tagName) => (
              <button
                className="community-chip community-chip-compact community-chip-link"
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
          <div className="px-3 py-5 text-center text-sm text-[#667085]">
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
          <>
            <div className="divide-y divide-[#edf1f7] md:hidden">
              {posts.map((post, index) => {
                const postNumber =
                  pagination.total - (page - 1) * PAGE_SIZE - index;
                const isExpanded = expandedTagPostIds.includes(post.id);

                return (
                  <article className="px-3 py-4" key={post.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          {renderTagButton(
                            getPrimaryTag(post.tags),
                            () => handleSelectTag(getPrimaryTag(post.tags)),
                            "primary",
                          )}
                          {post.tags.length > 1 ? (
                            <button
                              className="community-chip community-chip-link px-2 py-1"
                              onClick={() => handleTogglePostTags(post.id)}
                              type="button"
                            >
                              {isExpanded ? "태그 접기" : `+${post.tags.length - 1}`}
                            </button>
                          ) : null}
                        </div>

                        <div className="flex min-w-0 items-start gap-2">
                          <Link
                            className="min-w-0 flex-1 break-words text-base font-black leading-6 text-[#202632] hover:text-[#2f4f9f] hover:underline"
                            href={`/posts/${post.id}`}
                          >
                            {post.title}
                          </Link>
                          {post.counts.comments > 0 ? (
                            <span className="shrink-0 text-xs font-black text-[#d71920]">
                              [{post.counts.comments}]
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-[#667085]">
                          {getPostPreview(post.content)}
                        </p>

                        {isExpanded && post.tags.length > 1 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {post.tags.slice(1).map((tag) => (
                              <button
                                className="community-chip px-2 py-1"
                                key={tag.id}
                                onClick={() => handleSelectTag(tag.name)}
                                type="button"
                              >
                                #{tag.name}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <span className="shrink-0 text-xs font-bold text-[#98a2b3]">
                        {postNumber}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#667085]">
                      <span className="font-bold text-[#344054]">
                        {post.author.nickname}
                      </span>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-sm bg-[#f6f8fc] px-2 py-1 text-xs font-bold text-[#475467]">
                        조회 {post.counts.views}
                      </span>
                      <span className="community-chip community-chip-link px-2 py-1">
                        추천 {post.counts.voteScore}
                      </span>
                      <span className="community-chip community-chip-accent px-2 py-1">
                        댓글 {post.counts.comments}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] table-fixed border-collapse text-[13px]">
                <thead className="border-b border-[#d8deea] bg-[#f6f8fc] text-[11px] font-bold text-[#667085]">
                  <tr>
                    <th className="w-10 px-2 py-1.5 text-center">번호</th>
                    <th className="w-28 px-2 py-1.5 text-center">태그</th>
                    <th className="px-2 py-1.5 text-left">제목</th>
                    <th className="w-20 px-2 py-1.5 text-center">글쓴이</th>
                    <th className="w-24 px-2 py-1.5 text-center">작성일</th>
                    <th className="w-12 px-2 py-1.5 text-center">조회</th>
                    <th className="w-12 px-2 py-1.5 text-center">추천</th>
                    <th className="w-12 px-2 py-1.5 text-center">댓글</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post, index) => {
                    const postNumber =
                      pagination.total - (page - 1) * PAGE_SIZE - index;

                    return (
                      <tr
                        className="h-9 border-b border-[#edf1f7] align-middle hover:bg-[#f8fafc]"
                        key={post.id}
                      >
                        <td className="px-2 py-1.5 text-center text-[11px] text-[#8a94a6]">
                          {postNumber}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex max-w-full items-center justify-center gap-1">
                              <button
                                className="community-chip community-chip-compact community-chip-link max-w-[82px] truncate"
                                onClick={() =>
                                  handleSelectTag(getPrimaryTag(post.tags))
                                }
                                type="button"
                              >
                                {getPrimaryTag(post.tags)}
                              </button>
                              {post.tags.length > 1 ? (
                                <button
                                  className="community-chip community-chip-compact community-chip-link shrink-0"
                                  onClick={() => handleTogglePostTags(post.id)}
                                  type="button"
                                >
                                  {expandedTagPostIds.includes(post.id)
                                    ? "접기"
                                    : `+${post.tags.length - 1}`}
                                </button>
                              ) : null}
                            </div>

                            {expandedTagPostIds.includes(post.id) &&
                            post.tags.length > 1 ? (
                              <div className="flex max-w-32 flex-wrap justify-center gap-1">
                                {post.tags.slice(1).map((tag) => (
                                  <button
                                    className="community-chip community-chip-compact max-w-full truncate"
                                    key={tag.id}
                                    onClick={() => handleSelectTag(tag.name)}
                                    type="button"
                                  >
                                    {tag.name}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="min-w-0 px-2 py-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <Link
                              className="min-w-0 truncate font-bold leading-5 text-[#202632] hover:text-[#2f4f9f] hover:underline"
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
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs font-bold text-[#4b5563]">
                          {post.author.nickname}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs text-[#667085]">
                          {formatDate(post.createdAt)}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs font-bold text-[#4b5563]">
                          {post.counts.views}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs font-bold text-[#2f4f9f]">
                          {post.counts.voteScore}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs font-bold text-[#d71920]">
                          {post.counts.comments}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>

      <div className="community-panel flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-bold text-[#667085]">
          총 {pagination.total}개 · {pagination.page} /{" "}
          {Math.max(pagination.totalPages, 1)} 페이지
        </span>
        <div className="flex items-center gap-1.5">
          <button
            className="community-button-secondary px-3 text-xs"
            disabled={!pagination.hasPreviousPage}
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            type="button"
          >
            이전
          </button>
          <button
            className="community-button-secondary px-3 text-xs"
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

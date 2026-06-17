"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { SimilarPostsPanel } from "@/components/ai/similar-posts-panel";
import { CommentSection } from "@/components/comments/comment-section";
import { PostContentRenderer } from "@/components/posts/post-content-renderer";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
};

type Tag = {
  id: string;
  name: string;
};

type VoteType = "UP" | "DOWN";

type Post = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: CurrentUser;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  counts: {
    comments: number;
    tags: number;
    views: number;
    upVotes: number;
    downVotes: number;
    voteScore: number;
  };
  viewerVote: VoteType | null;
};

type PostResponse = {
  post?: Post;
  message?: string;
};

type AuthMeResponse = {
  user?: CurrentUser;
};

type VoteResponse = {
  vote?: {
    upVotes: number;
    downVotes: number;
    voteScore: number;
    viewerVote: VoteType | null;
  };
  message?: string;
};

type ViewResponse = {
  views?: number;
  message?: string;
};

type PostDetailProps = {
  postId: string;
  revision?: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getViewSessionKey(postId: string): string {
  return `post-viewed:${postId}`;
}

export function PostDetail({ postId, revision = "" }: PostDetailProps) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      setMessage("");
      setPost(null);

      try {
        const [postResponse, userResponse] = await Promise.all([
          fetch(`/api/posts/${postId}`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/auth/me", {
            credentials: "include",
          }),
        ]);
        const postData = (await postResponse.json()) as PostResponse;

        if (!isMounted) {
          return;
        }

        if (!postResponse.ok || !postData.post) {
          setMessage(postData.message ?? "게시글을 찾을 수 없습니다.");
          setPost(null);
          return;
        }

        const loadedPost = postData.post;
        setPost(loadedPost);

        const viewSessionKey = getViewSessionKey(loadedPost.id);

        if (!window.sessionStorage.getItem(viewSessionKey)) {
          window.sessionStorage.setItem(viewSessionKey, "true");

          void fetch(`/api/posts/${loadedPost.id}/views`, {
            method: "POST",
            credentials: "include",
          })
            .then(async (viewResponse) => {
              const viewData = (await viewResponse.json()) as ViewResponse;

              if (!viewResponse.ok || typeof viewData.views !== "number") {
                return;
              }

              const nextViews = viewData.views;

              setPost((currentPost) =>
                currentPost?.id === loadedPost.id
                  ? {
                      ...currentPost,
                      counts: {
                        ...currentPost.counts,
                        views: nextViews,
                      },
                    }
                  : currentPost,
              );
            })
            .catch(() => undefined);
        }

        if (userResponse.ok) {
          const userData = (await userResponse.json()) as AuthMeResponse;
          setCurrentUser(userData.user ?? null);
        } else {
          setCurrentUser(null);
        }
      } catch {
        if (isMounted) {
          setMessage("네트워크 연결을 확인해주세요.");
          setPost(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [postId, revision]);

  async function handleDelete() {
    if (!post || !confirm("이 게시글을 삭제할까요?")) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "게시글을 삭제하지 못했습니다.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleVote(type: VoteType) {
    if (!post) {
      return;
    }

    if (!currentUser) {
      setMessage("추천/비추천은 로그인 후 사용할 수 있습니다.");
      return;
    }

    setIsVoting(true);
    setMessage("");

    const nextType = post.viewerVote === type ? null : type;

    try {
      const response = await fetch(`/api/posts/${post.id}/votes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: nextType,
        }),
      });
      const data = (await response.json()) as VoteResponse;

      if (!response.ok || !data.vote) {
        setMessage(data.message ?? "추천 정보를 저장하지 못했습니다.");
        return;
      }

      const nextVote = data.vote;

      setPost((currentPost) =>
        currentPost
          ? {
              ...currentPost,
              viewerVote: nextVote.viewerVote,
              counts: {
                ...currentPost.counts,
                upVotes: nextVote.upVotes,
                downVotes: nextVote.downVotes,
                voteScore: nextVote.voteScore,
              },
            }
          : currentPost,
      );
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsVoting(false);
    }
  }

  const handleCommentCountChange = useCallback((nextCount: number) => {
    setPost((currentPost) =>
      currentPost
        ? {
            ...currentPost,
            counts: {
              ...currentPost.counts,
              comments: nextCount,
            },
          }
        : currentPost,
    );
  }, []);

  if (isLoading) {
    return (
      <section className="page-shell">
        <div className="community-panel p-5 text-sm text-[#667085]">
          게시글을 불러오는 중입니다.
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="page-shell">
        <div className="community-panel p-6">
          <h2 className="text-xl font-black text-[#071a3d]">
            게시글을 찾을 수 없습니다.
          </h2>
          {message ? (
            <p className="mt-2 text-sm text-[#667085]">{message}</p>
          ) : null}
          <Link className="community-button-primary mt-5" href="/">
            목록으로
          </Link>
        </div>
      </section>
    );
  }

  const isOwner = currentUser?.id === post.authorId;
  const isUpdated = post.updatedAt !== post.createdAt;

  return (
    <section className="page-shell space-y-4">
      {message ? (
        <p className="rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <article className="community-panel min-w-0">
            <div className="community-panel-header">
              <div className="flex items-center gap-2">
                <Link className="community-button-secondary community-button-compact" href="/">
                  목록으로
                </Link>
                <span className="text-[11px] font-bold text-[#667085]">
                  게시글 상세
                </span>
              </div>

              {isOwner ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="community-button-secondary community-button-compact"
                    href={`/posts/${post.id}/edit`}
                  >
                    수정
                  </Link>
                  <button
                    className="community-button-danger-outline disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    type="button"
                  >
                    {isDeleting ? "삭제 중" : "삭제"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {post.tags.length > 0 ? (
                  post.tags.map((tag) => (
                    <Link
                      className="community-chip community-chip-link"
                      href={`/?tag=${encodeURIComponent(tag.name)}`}
                      key={tag.id}
                    >
                      #{tag.name}
                    </Link>
                  ))
                ) : (
                  <span className="community-chip">
                    태그 없음
                  </span>
                )}
              </div>

              <h2 className="mt-4 break-words text-2xl font-black leading-tight text-[#071a3d] sm:text-3xl">
                {post.title}
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="community-chip text-[#475467]">
                  작성 {formatDate(post.createdAt)}
                </span>
                {isUpdated ? (
                  <span className="community-chip text-[#475467]">
                    수정 {formatDate(post.updatedAt)}
                  </span>
                ) : null}
                <span className="community-chip text-[#475467]">
                  작성자 {post.author.nickname}
                </span>
              </div>

              <PostContentRenderer
                className="mt-5 break-words border-t border-[#d8deea] pt-6 text-[15px] leading-8 text-[#202632]"
                content={post.content}
              />

              <div className="mt-6 rounded-sm border border-[#d8deea] bg-[#f8fafc] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                  <button
                    className="community-vote-button community-vote-button-up disabled:cursor-not-allowed disabled:opacity-60"
                    data-active={post.viewerVote === "UP"}
                    disabled={isVoting}
                    onClick={() => void handleVote("UP")}
                    type="button"
                  >
                    추천 {post.counts.upVotes}
                  </button>
                  <div className="rounded-sm border border-[#d8deea] bg-white px-3 py-2 text-center text-sm font-black text-[#1f3470] sm:min-w-16">
                    {post.counts.voteScore >= 0 ? "+" : ""}
                    {post.counts.voteScore}
                  </div>
                  <button
                    className="community-vote-button community-vote-button-down disabled:cursor-not-allowed disabled:opacity-60"
                    data-active={post.viewerVote === "DOWN"}
                    disabled={isVoting}
                    onClick={() => void handleVote("DOWN")}
                    type="button"
                  >
                    비추천 {post.counts.downVotes}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <section className="community-panel">
            <div className="community-panel-header">
              <h3 className="text-sm font-black text-[#071a3d]">글 정보</h3>
              <span className="text-[11px] font-bold text-[#667085]">
                읽기 요약
              </span>
            </div>
            <dl className="grid gap-2 px-3 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs font-bold text-[#667085]">작성자</dt>
                <dd className="text-right font-black text-[#202632]">
                  {post.author.nickname}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs font-bold text-[#667085]">조회</dt>
                <dd className="text-right font-black text-[#202632]">
                  {post.counts.views}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs font-bold text-[#667085]">추천</dt>
                <dd className="text-right font-black text-[#202632]">
                  {post.counts.voteScore}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs font-bold text-[#667085]">댓글</dt>
                <dd className="text-right font-black text-[#202632]">
                  {post.counts.comments}개
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs font-bold text-[#667085]">참여</dt>
                <dd className="text-right text-xs font-bold text-[#667085]">
                  {currentUser ? "추천/댓글 가능" : "로그인 후 참여 가능"}
                </dd>
              </div>
            </dl>
          </section>

          <SimilarPostsPanel className="mt-0" postId={post.id} />
        </aside>
      </div>

      <CommentSection
        className="mt-0"
        onCommentCountChange={handleCommentCountChange}
        postId={post.id}
      />
    </section>
  );
}

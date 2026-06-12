"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { SimilarPostsPanel } from "@/components/ai/similar-posts-panel";
import { CommentSection } from "@/components/comments/comment-section";

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

type VoteType = "UP" | "DOWN";

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
      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-md border border-[#d9e2ec] bg-white p-5 text-sm text-[#5e6a7d]">
          게시글을 불러오는 중입니다.
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-md border border-[#d9e2ec] bg-white p-6">
          <h2 className="text-xl font-semibold">게시글을 찾을 수 없습니다.</h2>
          {message ? (
            <p className="mt-2 text-sm text-[#5e6a7d]">{message}</p>
          ) : null}
          <Link
            className="mt-5 inline-flex rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59]"
            href="/"
          >
            목록으로
          </Link>
        </div>
      </section>
    );
  }

  const isOwner = currentUser?.id === post.authorId;

  return (
    <section className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          className="rounded-md border border-[#c8d3df] bg-white px-3 py-2 text-sm font-medium text-[#5e6a7d] hover:border-[#0f766e] hover:bg-[#f0fdfa]"
          href="/"
        >
          목록으로
        </Link>
        {isOwner ? (
          <div className="flex items-center gap-2">
            <Link
              className="rounded-md border border-[#c8d3df] bg-white px-3 py-2 text-sm font-semibold text-[#0f766e] hover:border-[#0f766e] hover:bg-[#f0fdfa]"
              href={`/posts/${post.id}/edit`}
            >
              수정
            </Link>
            <button
              className="rounded-md border border-[#fecaca] bg-white px-3 py-2 text-sm font-semibold text-[#b91c1c] hover:bg-[#fff1f2] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting}
              onClick={handleDelete}
              type="button"
            >
              {isDeleting ? "삭제 중" : "삭제"}
            </button>
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="mb-4 rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {message}
        </p>
      ) : null}

      <article className="rounded-md border border-[#d9e2ec] bg-white p-6">
        <div className="flex flex-wrap gap-2">
          {post.tags.length > 0 ? (
            post.tags.map((tag) => (
              <span
                className="rounded-md bg-[#e6f4f1] px-2.5 py-1 text-xs font-semibold text-[#0f766e]"
                key={tag.id}
              >
                #{tag.name}
              </span>
            ))
          ) : (
            <span className="rounded-md bg-[#eef4f7] px-2.5 py-1 text-xs font-semibold text-[#5e6a7d]">
              태그 없음
            </span>
          )}
        </div>

        <h2 className="mt-4 text-2xl font-bold leading-9 text-[#172033]">
          {post.title}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#5e6a7d]">
          <span>{post.author.nickname}</span>
          <span>|</span>
          <span>{formatDate(post.createdAt)}</span>
          <span>|</span>
          <span>조회 {post.counts.views}</span>
          <span>|</span>
          <span>추천 {post.counts.voteScore}</span>
          <span>|</span>
          <span>댓글 {post.counts.comments}개</span>
        </div>

        <div className="mt-6 whitespace-pre-wrap border-t border-[#d9e2ec] pt-6 text-sm leading-7 text-[#172033]">
          {post.content}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 border-t border-[#d9e2ec] pt-5 sm:flex-row sm:justify-center">
          <button
            className={
              post.viewerVote === "UP"
                ? "inline-flex h-10 min-w-28 items-center justify-center rounded-sm bg-[#2f4f9f] px-4 text-sm font-black text-white hover:bg-[#1f3470] disabled:cursor-not-allowed disabled:opacity-60"
                : "inline-flex h-10 min-w-28 items-center justify-center rounded-sm border border-[#b9c3d7] bg-white px-4 text-sm font-black text-[#2f4f9f] hover:border-[#2f4f9f] hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-60"
            }
            disabled={isVoting}
            onClick={() => void handleVote("UP")}
            type="button"
          >
            추천 {post.counts.upVotes}
          </button>
          <div className="rounded-sm border border-[#d8deea] bg-[#f6f8fc] px-3 py-2 text-sm font-black text-[#1f3470]">
            {post.counts.voteScore >= 0 ? "+" : ""}
            {post.counts.voteScore}
          </div>
          <button
            className={
              post.viewerVote === "DOWN"
                ? "inline-flex h-10 min-w-28 items-center justify-center rounded-sm bg-[#b91c1c] px-4 text-sm font-black text-white hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-60"
                : "inline-flex h-10 min-w-28 items-center justify-center rounded-sm border border-[#fecaca] bg-white px-4 text-sm font-black text-[#b91c1c] hover:bg-[#fff1f2] disabled:cursor-not-allowed disabled:opacity-60"
            }
            disabled={isVoting}
            onClick={() => void handleVote("DOWN")}
            type="button"
          >
            비추천 {post.counts.downVotes}
          </button>
        </div>
      </article>
      <SimilarPostsPanel postId={post.id} />
      <CommentSection
        onCommentCountChange={handleCommentCountChange}
        postId={post.id}
      />
    </section>
  );
}

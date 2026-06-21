"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { MobileShareButton } from "@/components/mobile-app/mobile-share-button";
import { OpenWebButton } from "@/components/mobile-app/open-web-button";
import { PostContentRenderer } from "@/components/posts/post-content-renderer";
import { getPostPreviewText } from "@/lib/posts/content";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
  favoriteTeam?: string | null;
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

type Comment = {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  author: CurrentUser;
  createdAt: string;
  updatedAt: string;
};

type SimilarPost = {
  id: string;
  title: string;
  content: string;
  tags: Tag[];
  similarity: number;
};

type PostResponse = {
  post?: Post;
  message?: string;
};

type AuthMeResponse = {
  user?: CurrentUser;
};

type CommentsResponse = {
  comments?: Comment[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

type CommentResponse = {
  comment?: Comment;
  message?: string;
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
};

type SimilarPostsResponse = {
  status: "ready" | "disabled" | "unavailable" | "not_found";
  message?: string;
  summary: string | null;
  similarPosts: SimilarPost[];
};

type MobilePostDetailProps = {
  postId: string;
};

const COMMENT_PAGE_SIZE = 20;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSimilarity(value: number): string {
  return `${Math.round(Math.max(0, Math.min(value, 1)) * 100)}%`;
}

function getViewSessionKey(postId: string): string {
  return `mobile-post-viewed:${postId}`;
}

function MobileCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-[18px] border border-white/70 bg-white p-4 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}

export function MobilePostDetail({ postId }: MobilePostDetailProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [similarData, setSimilarData] = useState<SimilarPostsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [message, setMessage] = useState("");

  const isOwner = currentUser?.id === post?.authorId;
  const postTagNames = useMemo(
    () => post?.tags.map((tag) => `#${tag.name}`).join(" ") ?? "",
    [post],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPostDetail() {
      setIsLoading(true);
      setMessage("");

      try {
        const [postResponse, userResponse, commentsResponse] =
          await Promise.all([
            fetch(`/api/posts/${postId}`, {
              cache: "no-store",
              credentials: "include",
            }),
            fetch("/api/auth/me", {
              credentials: "include",
            }),
            fetch(
              `/api/posts/${postId}/comments?page=1&pageSize=${COMMENT_PAGE_SIZE}`,
              {
                credentials: "include",
              },
            ),
          ]);

        const postData = (await postResponse.json()) as PostResponse;

        if (!isMounted) {
          return;
        }

        if (!postResponse.ok || !postData.post) {
          setPost(null);
          setMessage(postData.message ?? "게시글을 찾지 못했습니다.");
          return;
        }

        const loadedPost = postData.post;
        setPost(loadedPost);

        if (userResponse.ok) {
          const userData = (await userResponse.json()) as AuthMeResponse;
          setCurrentUser(userData.user ?? null);
        } else {
          setCurrentUser(null);
        }

        if (commentsResponse.ok) {
          const commentsData = (await commentsResponse.json()) as CommentsResponse;
          setComments(commentsData.comments ?? []);
        } else {
          setComments([]);
        }

        const viewSessionKey = getViewSessionKey(loadedPost.id);

        if (!window.sessionStorage.getItem(viewSessionKey)) {
          window.sessionStorage.setItem(viewSessionKey, "true");

          void fetch(`/api/posts/${loadedPost.id}/views`, {
            method: "POST",
            credentials: "include",
          })
            .then(async (viewResponse) => {
              if (!viewResponse.ok) {
                return;
              }

              const viewData = (await viewResponse.json()) as ViewResponse;

              if (typeof viewData.views !== "number") {
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
      } catch {
        if (isMounted) {
          setPost(null);
          setMessage("네트워크 연결을 확인해주세요.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPostDetail();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  async function handleVote(type: VoteType) {
    if (!post) {
      return;
    }

    if (!currentUser) {
      setMessage("추천과 비추천은 로그인 후 사용할 수 있습니다.");
      return;
    }

    setIsVoting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/posts/${post.id}/votes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: post.viewerVote === type ? null : type,
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

  async function handleCreateComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!post) {
      return;
    }

    if (!currentUser) {
      setMessage("댓글은 로그인 후 작성할 수 있습니다.");
      return;
    }

    setIsSubmittingComment(true);
    setMessage("");

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          content: commentContent,
        }),
      });
      const data = (await response.json()) as CommentResponse;

      if (!response.ok || !data.comment) {
        setMessage(data.message ?? "댓글을 등록하지 못했습니다.");
        return;
      }

      const createdComment = data.comment;

      setComments((currentComments) => [...currentComments, createdComment]);
      setPost((currentPost) =>
        currentPost
          ? {
              ...currentPost,
              counts: {
                ...currentPost.counts,
                comments: currentPost.counts.comments + 1,
              },
            }
          : currentPost,
      );
      setCommentContent("");
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleLoadSimilarPosts() {
    if (!post) {
      return;
    }

    setIsLoadingSimilar(true);
    setSimilarData(null);
    setMessage("");

    try {
      const response = await fetch(
        `/api/ai/rag/similar-posts?postId=${encodeURIComponent(post.id)}`,
        {
          credentials: "include",
        },
      );
      const data = (await response.json()) as SimilarPostsResponse;

      setSimilarData(data);
    } catch {
      setSimilarData({
        status: "unavailable",
        message: "비슷한 글을 불러오지 못했습니다.",
        summary: null,
        similarPosts: [],
      });
    } finally {
      setIsLoadingSimilar(false);
    }
  }

  if (isLoading) {
    return (
      <section className="min-h-screen bg-[#dfe7f3] px-4 py-8 text-[#101827]">
        <div className="mx-auto max-w-md">
          <MobileCard>
            <p className="text-sm font-bold text-[#667085]">
              게시글을 불러오는 중입니다.
            </p>
          </MobileCard>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="min-h-screen bg-[#dfe7f3] px-4 py-8 text-[#101827]">
        <div className="mx-auto max-w-md space-y-3">
          <Link
            className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-black text-[#071a3d]"
            href="/mobile-app"
          >
            앱 홈
          </Link>
          <MobileCard>
            <h1 className="text-xl font-black text-[#071a3d]">
              게시글을 찾지 못했습니다.
            </h1>
            {message ? (
              <p className="mt-2 text-sm leading-6 text-[#667085]">{message}</p>
            ) : null}
          </MobileCard>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#dfe7f3] text-[#101827]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#f3f6fb] shadow-2xl md:my-6 md:min-h-[860px] md:overflow-hidden md:rounded-[32px] md:border md:border-white">
        <header className="bg-[#071a3d] px-5 pb-5 pt-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white"
              href="/mobile-app"
            >
              앱 홈
            </Link>
            <MobileShareButton
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white"
              text={`${post.author.nickname}님의 게시글`}
              title={post.title}
              url={`/mobile-app/posts/${post.id}`}
            >
              공유
            </MobileShareButton>
            <OpenWebButton
              className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#071a3d]"
              href={`/posts/${post.id}`}
            >
              웹에서 보기
            </OpenWebButton>
          </div>

          <div className="mt-5">
            <p className="text-xs font-black text-white/55">
              {post.author.nickname} · 조회 {post.counts.views}
            </p>
            <h1 className="mt-2 break-words text-2xl font-black leading-tight tracking-tight">
              {post.title}
            </h1>
            <p className="mt-3 text-xs font-bold text-white/65">
              {formatDate(post.createdAt)}
            </p>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8">
          {message ? (
            <p className="mb-3 rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
              {message}
            </p>
          ) : null}

          <div className="space-y-3">
            <MobileCard>
              {post.tags.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#2f4f9f]"
                      href={`/?tag=${encodeURIComponent(tag.name)}`}
                      key={tag.id}
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              ) : null}

              <PostContentRenderer
                className="break-words text-[15px] leading-8 text-[#202632]"
                content={post.content}
              />

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#edf1f7] pt-4">
                <button
                  className={[
                    "rounded-2xl px-2 py-3 text-sm font-black",
                    post.viewerVote === "UP"
                      ? "bg-[#d71920] text-white"
                      : "bg-[#fff1f2] text-[#d71920]",
                  ].join(" ")}
                  disabled={isVoting}
                  onClick={() => void handleVote("UP")}
                  type="button"
                >
                  추천 {post.counts.upVotes}
                </button>
                <div className="rounded-2xl bg-[#fbfcff] px-2 py-3 text-center text-sm font-black text-[#071a3d]">
                  {post.counts.voteScore >= 0 ? "+" : ""}
                  {post.counts.voteScore}
                </div>
                <button
                  className={[
                    "rounded-2xl px-2 py-3 text-sm font-black",
                    post.viewerVote === "DOWN"
                      ? "bg-[#475467] text-white"
                      : "bg-[#f2f4f7] text-[#475467]",
                  ].join(" ")}
                  disabled={isVoting}
                  onClick={() => void handleVote("DOWN")}
                  type="button"
                >
                  비추천 {post.counts.downVotes}
                </button>
              </div>

              {isOwner ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    className="community-button-secondary justify-center"
                    href={`/posts/${post.id}/edit`}
                  >
                    수정
                  </Link>
                  <Link
                    className="community-button-primary justify-center"
                    href={`/mobile-app/write?title=${encodeURIComponent(
                      post.title,
                    )}&tags=${encodeURIComponent(postTagNames.replaceAll("#", ""))}`}
                  >
                    이어쓰기
                  </Link>
                </div>
              ) : null}
            </MobileCard>

            <MobileCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#071a3d]">
                    비슷한 글
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#667085]">
                    이 글과 가까운 경기 리뷰를 찾아봅니다.
                  </p>
                </div>
                <button
                  className="community-button-secondary community-button-compact shrink-0"
                  disabled={isLoadingSimilar}
                  onClick={() => void handleLoadSimilarPosts()}
                  type="button"
                >
                  {isLoadingSimilar ? "확인 중" : "확인"}
                </button>
              </div>

              {similarData?.message ? (
                <p className="mt-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
                  {similarData.message}
                </p>
              ) : null}

              {similarData?.summary ? (
                <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-sm leading-6 text-[#344054]">
                  {similarData.summary}
                </p>
              ) : null}

              {similarData && similarData.similarPosts.length === 0 ? (
                <p className="mt-3 text-sm text-[#667085]">
                  아직 비슷한 글을 찾지 못했습니다.
                </p>
              ) : null}

              {similarData && similarData.similarPosts.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {similarData.similarPosts.slice(0, 4).map((similarPost) => (
                    <Link
                      className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3"
                      href={`/mobile-app/posts/${similarPost.id}`}
                      key={similarPost.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-black leading-5 text-[#202632]">
                          {similarPost.title}
                        </p>
                        <span className="shrink-0 text-xs font-black text-[#d71920]">
                          {formatSimilarity(similarPost.similarity)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#667085]">
                        {getPostPreviewText(similarPost.content, 96)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </MobileCard>

            <MobileCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#071a3d]">댓글</p>
                  <p className="mt-1 text-xs text-[#667085]">
                    {post.counts.comments}개
                  </p>
                </div>
                {!currentUser ? (
                  <Link
                    className="rounded-full bg-[#eef3ff] px-3 py-2 text-xs font-black text-[#2f4f9f]"
                    href="/login"
                  >
                    로그인
                  </Link>
                ) : null}
              </div>

              {currentUser ? (
                <form className="mt-3" onSubmit={handleCreateComment}>
                  <textarea
                    className="community-textarea min-h-24 resize-y text-sm leading-6"
                    maxLength={5000}
                    onChange={(event) => setCommentContent(event.target.value)}
                    placeholder="경기 내용이나 선수 평가를 남겨보세요."
                    required
                    value={commentContent}
                  />
                  <button
                    className="community-button-primary mt-2 w-full justify-center disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
                    disabled={isSubmittingComment}
                    type="submit"
                  >
                    {isSubmittingComment ? "등록 중" : "댓글 등록"}
                  </button>
                </form>
              ) : (
                <p className="mt-3 rounded-2xl bg-[#fbfcff] px-3 py-3 text-sm leading-6 text-[#667085]">
                  댓글 작성은 로그인 후 사용할 수 있습니다.
                </p>
              )}

              <div className="mt-4 grid gap-2">
                {comments.map((comment) => (
                  <article
                    className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3"
                    key={comment.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-[#202632]">
                        {comment.author.nickname}
                      </p>
                      <p className="shrink-0 text-[11px] font-bold text-[#667085]">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#344054]">
                      {comment.content}
                    </p>
                  </article>
                ))}

                {comments.length === 0 ? (
                  <p className="rounded-2xl bg-[#fbfcff] px-3 py-3 text-sm text-[#667085]">
                    아직 댓글이 없습니다.
                  </p>
                ) : null}
              </div>
            </MobileCard>
          </div>
        </main>
      </div>
    </section>
  );
}

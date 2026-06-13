"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
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

type CommentsResponse = {
  comments?: Comment[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  message?: string;
};

type CommentResponse = {
  comment?: Comment;
  message?: string;
};

type AuthMeResponse = {
  user?: CurrentUser;
};

type ModerationResult = {
  verdict: "allow" | "warn" | "block";
  message: string;
  reasons: string[];
  suggestions: string[];
};

type ModerationResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: ModerationResult;
};

type CommentSectionProps = {
  postId: string;
  onCommentCountChange?: (nextCount: number) => void;
};

const PAGE_SIZE = 20;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getModerationMessage(result: ModerationResult): string {
  const reason = result.reasons[0] ? ` ${result.reasons[0]}` : "";
  const suggestion = result.suggestions[0] ? ` ${result.suggestions[0]}` : "";

  return `${result.message}${reason}${suggestion}`;
}

export function CommentSection({
  postId,
  onCommentCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [content, setContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/posts/${postId}/comments?page=1&pageSize=${PAGE_SIZE}`,
        {
          credentials: "include",
        },
      );
      const data = (await response.json()) as CommentsResponse;

      if (!response.ok || !data.comments || !data.pagination) {
        setMessage(data.message ?? "댓글을 불러오지 못했습니다.");
        setComments([]);
        onCommentCountChange?.(0);
        return;
      }

      setComments(data.comments);
      onCommentCountChange?.(data.pagination.total);
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [onCommentCountChange, postId]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
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
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialComments() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `/api/posts/${postId}/comments?page=1&pageSize=${PAGE_SIZE}`,
          {
            credentials: "include",
          },
        );
        const data = (await response.json()) as CommentsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.comments || !data.pagination) {
          setMessage(data.message ?? "댓글을 불러오지 못했습니다.");
          setComments([]);
          onCommentCountChange?.(0);
          return;
        }

        setComments(data.comments);
        onCommentCountChange?.(data.pagination.total);
      } catch {
        if (isMounted) {
          setMessage("네트워크 연결을 확인해주세요.");
          setComments([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialComments();

    return () => {
      isMounted = false;
    };
  }, [onCommentCountChange, postId]);

  async function runCommentModeration(
    nextContent: string,
  ): Promise<boolean> {
    try {
      const response = await fetch("/api/ai/agent/moderation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          targetType: "comment",
          content: nextContent,
        }),
      });
      const data = (await response.json()) as ModerationResponse;

      if (!response.ok || !data.result) {
        setMessage(data.message ?? "댓글 운영 정책 점검을 실행하지 못했습니다.");
        return false;
      }

      if (data.result.verdict !== "allow") {
        setMessage(getModerationMessage(data.result));
        return false;
      }

      return true;
    } catch {
      setMessage("댓글 운영 정책 점검 중 네트워크 오류가 발생했습니다.");

      return false;
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const moderationPassed = await runCommentModeration(content);

      if (!moderationPassed) {
        return;
      }

      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as CommentResponse;

      if (!response.ok || !data.comment) {
        setMessage(data.message ?? "댓글을 작성하지 못했습니다.");
        return;
      }

      setContent("");
      await loadComments();
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(commentId: string) {
    setMessage("");
    setIsSubmitting(true);

    try {
      const moderationPassed = await runCommentModeration(editingContent);

      if (!moderationPassed) {
        return;
      }

      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content: editingContent }),
      });
      const data = (await response.json()) as CommentResponse;

      if (!response.ok || !data.comment) {
        setMessage(data.message ?? "댓글을 수정하지 못했습니다.");
        return;
      }

      setEditingCommentId(null);
      setEditingContent("");
      await loadComments();
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("이 댓글을 삭제할까요?")) {
      return;
    }

    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "댓글을 삭제하지 못했습니다.");
        return;
      }

      await loadComments();
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-5 rounded-md border border-[#d9e2ec] bg-white p-6">
      <div className="border-b border-[#d9e2ec] pb-4">
        <h3 className="text-lg font-semibold">댓글</h3>
        <p className="mt-1 text-sm text-[#5e6a7d]">
          게시글에 대한 의견을 남기고 이어서 토론할 수 있습니다.
        </p>
      </div>

      {currentUser ? (
        <form className="mt-4 grid gap-3" onSubmit={handleCreate}>
          <textarea
            className="min-h-24 resize-y rounded-md border border-[#c8d3df] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#0f766e]"
            maxLength={5000}
            onChange={(event) => setContent(event.target.value)}
            placeholder="댓글을 입력하세요."
            required
            value={content}
          />
          <div className="flex justify-end">
            <button
              className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "처리 중" : "댓글 등록"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-md border border-[#d9e2ec] bg-[#f7f9fb] p-4 text-sm text-[#5e6a7d]">
          댓글 작성은{" "}
          <Link className="font-semibold text-[#0f766e]" href="/login">
            로그인
          </Link>
          이 필요합니다.
        </div>
      )}

      {message ? (
        <p className="mt-4 rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {message}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3">
        {isLoading ? (
          <div className="rounded-md border border-[#d9e2ec] bg-[#f7f9fb] p-4 text-sm text-[#5e6a7d]">
            댓글을 불러오는 중입니다.
          </div>
        ) : null}

        {!isLoading && comments.length === 0 ? (
          <div className="rounded-md border border-[#d9e2ec] bg-[#f7f9fb] p-4 text-sm text-[#5e6a7d]">
            아직 댓글이 없습니다.
          </div>
        ) : null}

        {comments.map((comment) => {
          const isOwner = currentUser?.id === comment.authorId;
          const isEditing = editingCommentId === comment.id;

          return (
            <article
              className="rounded-md border border-[#d9e2ec] bg-white p-4"
              key={comment.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-[#172033]">
                    {comment.author.nickname}
                  </span>
                  <span className="text-xs text-[#5e6a7d]">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>

                {isOwner ? (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <button
                        className="text-xs font-semibold text-[#5e6a7d] hover:text-[#0f766e]"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingContent("");
                        }}
                        type="button"
                      >
                        취소
                      </button>
                    ) : (
                      <button
                        className="text-xs font-semibold text-[#0f766e] hover:text-[#115e59]"
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditingContent(comment.content);
                        }}
                        type="button"
                      >
                        수정
                      </button>
                    )}
                    <button
                      className="text-xs font-semibold text-[#b91c1c] hover:text-[#7f1d1d]"
                      disabled={isSubmitting}
                      onClick={() => handleDelete(comment.id)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>

              {isEditing ? (
                <div className="mt-3 grid gap-2">
                  <textarea
                    className="min-h-24 resize-y rounded-md border border-[#c8d3df] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#0f766e]"
                    maxLength={5000}
                    onChange={(event) => setEditingContent(event.target.value)}
                    required
                    value={editingContent}
                  />
                  <div className="flex justify-end">
                    <button
                      className="rounded-md bg-[#0f766e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
                      disabled={isSubmitting}
                      onClick={() => handleUpdate(comment.id)}
                      type="button"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#172033]">
                  {comment.content}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

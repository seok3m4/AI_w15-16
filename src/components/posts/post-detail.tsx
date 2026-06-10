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
  };
};

type PostResponse = {
  post?: Post;
  message?: string;
};

type AuthMeResponse = {
  user?: CurrentUser;
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

export function PostDetail({ postId, revision = "" }: PostDetailProps) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
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

        setPost(postData.post);

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
          <span>댓글 {post.counts.comments}개</span>
        </div>

        <div className="mt-6 whitespace-pre-wrap border-t border-[#d9e2ec] pt-6 text-sm leading-7 text-[#172033]">
          {post.content}
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

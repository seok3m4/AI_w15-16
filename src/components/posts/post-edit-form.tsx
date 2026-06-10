"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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
  tags: Tag[];
};

type PostResponse = {
  post?: Post;
  message?: string;
};

type AuthMeResponse = {
  user?: CurrentUser;
};

type PostEditFormProps = {
  postId: string;
};

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function joinTags(tags: Tag[]): string {
  return tags.map((tag) => tag.name).join(", ");
}

export function PostEditForm({ postId }: PostEditFormProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      setIsLoading(true);
      setMessage("");

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
        setTitle(postData.post.title);
        setContent(postData.post.content);
        setTags(joinTags(postData.post.tags));

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

    void loadPost();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!post) {
      return;
    }

    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          content,
          tags: parseTags(tags),
        }),
      });
      const data = (await response.json()) as PostResponse;

      if (!response.ok) {
        setMessage(data.message ?? "게시글을 수정하지 못했습니다.");
        return;
      }

      router.push(`/posts/${post.id}?revision=${Date.now()}`);
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

  if (!currentUser || currentUser.id !== post.authorId) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-md border border-[#d9e2ec] bg-white p-6">
          <h2 className="text-xl font-semibold">수정 권한이 없습니다.</h2>
          <p className="mt-2 text-sm text-[#5e6a7d]">
            게시글 작성자만 이 글을 수정할 수 있습니다.
          </p>
          <Link
            className="mt-5 inline-flex rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59]"
            href={`/posts/${post.id}`}
          >
            상세로 돌아가기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-8">
      <div className="border-b border-[#d9e2ec] pb-4">
        <h2 className="text-xl font-semibold">게시글 수정</h2>
        <p className="mt-2 text-sm text-[#5e6a7d]">
          제목, 본문, 태그를 수정한 뒤 저장할 수 있습니다.
        </p>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-semibold text-[#172033]">
          제목
          <input
            className="h-11 rounded-md border border-[#c8d3df] bg-white px-3 text-sm font-normal outline-none focus:border-[#0f766e]"
            maxLength={120}
            minLength={2}
            onChange={(event) => setTitle(event.target.value)}
            required
            type="text"
            value={title}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-[#172033]">
          본문
          <textarea
            className="min-h-60 resize-y rounded-md border border-[#c8d3df] bg-white px-3 py-3 text-sm font-normal leading-6 outline-none focus:border-[#0f766e]"
            maxLength={20000}
            onChange={(event) => setContent(event.target.value)}
            required
            value={content}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-[#172033]">
          태그
          <input
            className="h-11 rounded-md border border-[#c8d3df] bg-white px-3 text-sm font-normal outline-none focus:border-[#0f766e]"
            onChange={(event) => setTags(event.target.value)}
            placeholder="kbo, 불펜, 경기리뷰"
            type="text"
            value={tags}
          />
        </label>

        {message ? (
          <p className="rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
            {message}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Link
            className="rounded-md border border-[#c8d3df] bg-white px-4 py-2 text-sm font-semibold text-[#5e6a7d] hover:border-[#0f766e] hover:bg-[#f0fdfa]"
            href={`/posts/${post.id}`}
          >
            취소
          </Link>
          <button
            className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "저장 중" : "수정 저장"}
          </button>
        </div>
      </form>
    </section>
  );
}

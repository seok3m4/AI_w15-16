"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
};

type AuthMeResponse = {
  user?: CurrentUser;
};

type CreatePostResponse = {
  message?: string;
  post?: {
    id: string;
  };
};

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function PostCreateForm() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
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
      const data = (await response.json()) as CreatePostResponse;

      if (!response.ok) {
        setMessage(data.message ?? "게시글을 작성하지 못했습니다.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-md border border-[#d9e2ec] bg-white p-5 text-sm text-[#5e6a7d]">
          로그인 상태를 확인하는 중입니다.
        </div>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-md border border-[#d9e2ec] bg-white p-6">
          <h2 className="text-xl font-semibold">로그인이 필요합니다.</h2>
          <p className="mt-2 text-sm text-[#5e6a7d]">
            게시글 작성은 로그인한 사용자만 사용할 수 있습니다.
          </p>
          <Link
            className="mt-5 inline-flex rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59]"
            href="/login"
          >
            로그인
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-8">
      <div className="border-b border-[#d9e2ec] pb-4">
        <h2 className="text-xl font-semibold">새 게시글 작성</h2>
        <p className="mt-2 text-sm text-[#5e6a7d]">
          {currentUser.nickname} 님의 야구 이야기로 게시판을 채워주세요.
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
            href="/"
          >
            취소
          </Link>
          <button
            className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "작성 중" : "게시글 등록"}
          </button>
        </div>
      </form>
    </section>
  );
}

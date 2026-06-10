"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ReviewAgentPanel,
  type ReviewAgentDraft,
} from "@/components/ai/review-agent-panel";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
};

type AuthMeResponse = {
  user?: CurrentUser;
};

type ExistingTag = {
  id: string;
  name: string;
  counts: {
    posts: number;
  };
};

type TagsResponse = {
  tags?: ExistingTag[];
  message?: string;
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

function formatTags(tagNames: string[]): string {
  return tagNames.join(", ");
}

export function PostCreateForm() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [existingTags, setExistingTags] = useState<ExistingTag[]>([]);
  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [tagMessage, setTagMessage] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTagNames = useMemo(() => parseTags(tags), [tags]);

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

  useEffect(() => {
    let isMounted = true;

    async function loadExistingTags() {
      setIsTagsLoading(true);
      setTagMessage("");

      try {
        const response = await fetch("/api/tags", {
          credentials: "include",
        });
        const data = (await response.json()) as TagsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.tags) {
          setExistingTags([]);
          setTagMessage(data.message ?? "기존 태그를 불러오지 못했습니다.");
          return;
        }

        setExistingTags(data.tags);
      } catch {
        if (isMounted) {
          setExistingTags([]);
          setTagMessage("기존 태그를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsTagsLoading(false);
        }
      }
    }

    void loadExistingTags();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("error");
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

  function handleApplyAgentDraft(draft: ReviewAgentDraft) {
    setTitle(draft.title);
    setContent(draft.draft);
    setTags(draft.tags.join(", "));
    setMessage("AI 초안을 작성 폼에 적용했습니다. 내용을 확인한 뒤 등록해주세요.");
    setMessageType("success");
  }

  function handleAddExistingTag(tagName: string) {
    setTags((currentTags) => {
      const nextTags = parseTags(currentTags);
      const isDuplicated = nextTags.some(
        (currentTag) => currentTag.toLowerCase() === tagName.toLowerCase(),
      );

      if (isDuplicated) {
        return currentTags;
      }

      return formatTags([...nextTags, tagName]);
    });
  }

  function handleRemoveTag(tagName: string) {
    setTags((currentTags) =>
      formatTags(
        parseTags(currentTags).filter(
          (currentTag) => currentTag.toLowerCase() !== tagName.toLowerCase(),
        ),
      ),
    );
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
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
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

          <section className="rounded-md border border-[#d7dde8] bg-[#f8fafc] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-[#071a3d]">기존 태그</p>
                <p className="mt-1 text-xs font-medium text-[#64748b]">
                  클릭하면 태그 입력창에 추가됩니다.
                </p>
              </div>
              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-[#64748b]">
                {existingTags.length}개
              </span>
            </div>

            {selectedTagNames.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[#d7dde8] pt-3">
                {selectedTagNames.map((tagName) => (
                  <button
                    className="rounded-md bg-[#fff1f2] px-2.5 py-1 text-xs font-bold text-[#d71920] hover:bg-[#ffe4e6]"
                    key={tagName}
                    onClick={() => handleRemoveTag(tagName)}
                    type="button"
                  >
                    #{tagName} 삭제
                  </button>
                ))}
              </div>
            ) : null}

            {isTagsLoading ? (
              <p className="mt-3 text-sm text-[#64748b]">
                기존 태그를 불러오는 중입니다.
              </p>
            ) : null}

            {tagMessage ? (
              <p className="mt-3 text-sm text-[#b91c1c]">{tagMessage}</p>
            ) : null}

            {!isTagsLoading && existingTags.length === 0 && !tagMessage ? (
              <p className="mt-3 text-sm text-[#64748b]">
                아직 등록된 태그가 없습니다.
              </p>
            ) : null}

            {existingTags.length > 0 ? (
              <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                {existingTags.map((tag) => {
                  const isSelected = selectedTagNames.some(
                    (tagName) =>
                      tagName.toLowerCase() === tag.name.toLowerCase(),
                  );

                  return (
                    <button
                      className={
                        isSelected
                          ? "rounded-md border border-[#d71920] bg-[#fff1f2] px-2.5 py-1 text-xs font-black text-[#d71920]"
                          : "rounded-md border border-[#d7dde8] bg-white px-2.5 py-1 text-xs font-bold text-[#475569] hover:border-[#d71920] hover:text-[#d71920]"
                      }
                      disabled={isSelected}
                      key={tag.id}
                      onClick={() => handleAddExistingTag(tag.name)}
                      type="button"
                    >
                      #{tag.name} {tag.counts.posts}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          {message ? (
            <p
              className={`rounded-md border px-3 py-2 text-sm ${
                messageType === "success"
                  ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
                  : "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]"
              }`}
            >
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
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <ReviewAgentPanel onApplyDraft={handleApplyAgentDraft} />
      </aside>
    </section>
  );
}

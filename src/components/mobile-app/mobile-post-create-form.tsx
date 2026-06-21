"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ReviewAgentPanel,
  type ReviewAgentDraft,
} from "@/components/ai/review-agent-panel";
import { KBO_TEAMS } from "@/lib/kbo/game";
import { POST_CONTENT_MAX_LENGTH } from "@/lib/posts/content";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
  favoriteTeam: string | null;
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

type SimilarPost = {
  id: string;
  title: string;
  similarity: number;
  tags: {
    id: string;
    name: string;
  }[];
};

type DraftSimilarPostsResponse = {
  status: "ready" | "disabled" | "unavailable" | "not_found";
  message?: string;
  summary: string | null;
  similarPosts: SimilarPost[];
  duplicateRisk: "none" | "low" | "medium" | "high";
  duplicateWarning: string | null;
};

type MobilePostCreateFormProps = {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialSource?: string;
};

const quickTags = [
  "KBO",
  "경기리뷰",
  "선발",
  "불펜",
  "타선",
  "수비",
  "라인업",
  "기록",
];

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tagName) => tagName.trim())
    .filter(Boolean);
}

function formatTags(tagNames: string[]): string {
  return tagNames.join(", ");
}

function formatSimilarity(value: number): string {
  return `${Math.round(Math.max(0, Math.min(value, 1)) * 100)}%`;
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

function SharedDraftNotice() {
  return (
    <MobileCard className="border-[#bae6fd] bg-[#f0f9ff]">
      <p className="text-xs font-black text-[#0369a1]">
        공유한 내용으로 초안을 채웠습니다
      </p>
      <p className="mt-1 text-sm leading-6 text-[#075985]">
        뉴스 URL이나 텍스트를 앱 공유 시트에서 받아왔습니다. 본문을 다듬고
        비슷한 글을 확인한 뒤 등록해주세요.
      </p>
    </MobileCard>
  );
}

export function MobilePostCreateForm({
  initialTitle = "",
  initialContent = "",
  initialTags = [],
  initialSource = "",
}: MobilePostCreateFormProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState(formatTags(initialTags));
  const [similarData, setSimilarData] =
    useState<DraftSimilarPostsResponse | null>(null);
  const [isCheckingSimilar, setIsCheckingSimilar] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTags = useMemo(() => parseTags(tags), [tags]);
  const isSharedDraft = ["android-share", "web-share"].includes(initialSource);
  const canCheckSimilar = title.trim().length >= 2 && content.trim().length >= 10;
  const canSubmit =
    title.trim().length >= 2 && content.trim().length >= 10 && !isSubmitting;

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

  function addTag(tagName: string) {
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

  function removeTag(tagName: string) {
    setTags((currentTags) =>
      formatTags(
        parseTags(currentTags).filter(
          (currentTag) => currentTag.toLowerCase() !== tagName.toLowerCase(),
        ),
      ),
    );
  }

  function handleApplyAgentDraft(draft: ReviewAgentDraft) {
    setTitle(draft.title);
    setContent(draft.draft);
    setTags(draft.tags.join(", "));
    setMessage("초안을 적용했습니다. 내용을 확인한 뒤 등록해주세요.");
    setMessageType("success");
  }

  async function handleCheckSimilarPosts() {
    setIsCheckingSimilar(true);
    setMessage("");
    setSimilarData(null);

    try {
      const response = await fetch("/api/ai/rag/draft-similar-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          content,
          tags: selectedTags,
        }),
      });
      const data = (await response.json()) as DraftSimilarPostsResponse;

      setSimilarData(data);
    } catch {
      setSimilarData({
        status: "unavailable",
        message: "비슷한 글을 확인하지 못했습니다.",
        summary: null,
        similarPosts: [],
        duplicateRisk: "none",
        duplicateWarning: null,
      });
    } finally {
      setIsCheckingSimilar(false);
    }
  }

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
          tags: selectedTags,
        }),
      });
      const data = (await response.json()) as CreatePostResponse;

      if (!response.ok || !data.post) {
        setMessage(data.message ?? "게시글을 작성하지 못했습니다.");
        return;
      }

      router.push(`/mobile-app/posts/${data.post.id}`);
      router.refresh();
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <section className="min-h-screen bg-[#dfe7f3] px-4 py-8 text-[#101827]">
        <div className="mx-auto max-w-md space-y-3">
          {isSharedDraft ? <SharedDraftNotice /> : null}
          <MobileCard>
            <p className="text-sm font-bold text-[#667085]">
              로그인 상태를 확인하는 중입니다.
            </p>
          </MobileCard>
        </div>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="min-h-screen bg-[#dfe7f3] px-4 py-8 text-[#101827]">
        <div className="mx-auto max-w-md space-y-3">
          <Link
            className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-black text-[#071a3d]"
            href="/mobile-app"
          >
            앱 홈
          </Link>
          {isSharedDraft ? <SharedDraftNotice /> : null}
          <MobileCard>
            <p className="text-xs font-black text-[#d71920]">글쓰기</p>
            <h1 className="mt-1 text-xl font-black text-[#071a3d]">
              로그인이 필요합니다
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              앱에서 작성한 글은 웹 게시판에도 함께 등록됩니다.
            </p>
            <div className="mt-4 grid gap-2">
              <Link className="community-button-primary" href="/login">
                로그인
              </Link>
              <Link className="community-button-secondary" href="/signup">
                회원가입
              </Link>
            </div>
          </MobileCard>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#dfe7f3] text-[#101827]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#f3f6fb] shadow-2xl md:my-6 md:min-h-[860px] md:overflow-hidden md:rounded-[32px] md:border md:border-white">
        <header className="bg-[#071a3d] px-5 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white"
              href="/mobile-app"
            >
              앱 홈
            </Link>
            <Link
              className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#071a3d]"
              href="/posts/new"
            >
              웹 작성
            </Link>
          </div>
          <div className="mt-5">
            <p className="text-xs font-black text-white/55">Review Writer</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              경기 리뷰 쓰기
            </h1>
            <p className="mt-2 text-sm font-bold text-white/65">
              {currentUser.nickname}님이 앱에서 작성한 글은 웹 게시판에도 바로
              올라갑니다.
            </p>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8">
          {isSharedDraft ? (
            <div className="mb-3">
              <SharedDraftNotice />
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <MobileCard>
              <label className="grid gap-2 text-sm font-black text-[#071a3d]">
                제목
                <input
                  className="community-input text-sm font-normal"
                  maxLength={120}
                  minLength={2}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  type="text"
                  value={title}
                />
              </label>
            </MobileCard>

            <MobileCard>
              <label className="grid gap-2 text-sm font-black text-[#071a3d]">
                본문
                <textarea
                  className="community-textarea min-h-64 resize-y text-sm font-normal leading-6"
                  maxLength={POST_CONTENT_MAX_LENGTH}
                  minLength={10}
                  onChange={(event) => setContent(event.target.value)}
                  required
                  value={content}
                />
              </label>
              <p className="mt-2 text-right text-[11px] font-bold text-[#667085]">
                {content.length.toLocaleString("ko-KR")} /{" "}
                {POST_CONTENT_MAX_LENGTH.toLocaleString("ko-KR")}
              </p>
            </MobileCard>

            <MobileCard>
              <label className="grid gap-2 text-sm font-black text-[#071a3d]">
                태그
                <input
                  className="community-input text-sm font-normal"
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="KBO, 경기리뷰, KIA"
                  type="text"
                  value={tags}
                />
              </label>

              {selectedTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTags.map((tagName) => (
                    <button
                      className="rounded-full bg-[#fff1f2] px-3 py-1.5 text-xs font-black text-[#d71920]"
                      key={tagName}
                      onClick={() => removeTag(tagName)}
                      type="button"
                    >
                      #{tagName} 삭제
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-4">
                <p className="text-xs font-black text-[#667085]">
                  빠른 태그
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...quickTags, ...KBO_TEAMS].map((tagName) => (
                    <button
                      className="rounded-full border border-[#d8deea] bg-[#fbfcff] px-3 py-1.5 text-xs font-black text-[#2f4f9f]"
                      key={tagName}
                      onClick={() => addTag(tagName)}
                      type="button"
                    >
                      #{tagName}
                    </button>
                  ))}
                </div>
              </div>
            </MobileCard>

            <MobileCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#071a3d]">
                    비슷한 글 확인
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#667085]">
                    등록 전에 이미 비슷한 경기 리뷰가 있는지 확인합니다.
                  </p>
                </div>
                <button
                  className="community-button-secondary community-button-compact shrink-0"
                  disabled={!canCheckSimilar || isCheckingSimilar}
                  onClick={() => void handleCheckSimilarPosts()}
                  type="button"
                >
                  {isCheckingSimilar ? "확인 중" : "확인"}
                </button>
              </div>

              {similarData?.message ? (
                <p className="mt-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
                  {similarData.message}
                </p>
              ) : null}

              {similarData?.duplicateWarning ? (
                <p className="mt-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
                  {similarData.duplicateWarning}
                </p>
              ) : null}

              {similarData?.summary ? (
                <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-sm leading-6 text-[#344054]">
                  {similarData.summary}
                </p>
              ) : null}

              {similarData && similarData.similarPosts.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {similarData.similarPosts.slice(0, 3).map((post) => (
                    <Link
                      className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3"
                      href={`/mobile-app/posts/${post.id}`}
                      key={post.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-black leading-5 text-[#202632]">
                          {post.title}
                        </p>
                        <span className="shrink-0 text-xs font-black text-[#d71920]">
                          {formatSimilarity(post.similarity)}
                        </span>
                      </div>
                      {post.tags.length > 0 ? (
                        <p className="mt-2 truncate text-xs font-bold text-[#667085]">
                          {post.tags
                            .slice(0, 3)
                            .map((tag) => `#${tag.name}`)
                            .join(" ")}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </MobileCard>

            {message ? (
              <p
                className={[
                  "rounded-2xl border px-3 py-2 text-sm",
                  messageType === "success"
                    ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
                    : "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]",
                ].join(" ")}
              >
                {message}
              </p>
            ) : null}

            <button
              className="community-button-primary community-button-large w-full disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
              disabled={!canSubmit}
              type="submit"
            >
              {isSubmitting ? "등록 중" : "게시글 등록"}
            </button>
          </form>

          <div className="mt-4">
            <ReviewAgentPanel onApplyDraft={handleApplyAgentDraft} />
          </div>
        </main>
      </div>
    </section>
  );
}

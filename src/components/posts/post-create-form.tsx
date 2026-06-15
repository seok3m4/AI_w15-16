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

type SimilarPost = {
  id: string;
  title: string;
  content: string;
  tags: {
    id: string;
    name: string;
  }[];
  similarity: number;
};

type DuplicateRisk = "none" | "low" | "medium" | "high";

type DraftSimilarPostsResponse = {
  status: "ready" | "disabled" | "unavailable" | "not_found";
  message?: string;
  summary: string | null;
  similarPosts: SimilarPost[];
  duplicateRisk: DuplicateRisk;
  duplicateWarning: string | null;
  topSimilarity: number | null;
};

type ModerationVerdict = "allow" | "warn" | "block";

type ModerationResult = {
  verdict: ModerationVerdict;
  severity: "safe" | "caution" | "unsafe";
  message: string;
  categories: string[];
  reasons: string[];
  suggestions: string[];
  modelUsed: boolean;
  toolTrace: string[];
};

type ModerationResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: ModerationResult;
};

type PostCreateFormProps = {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
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

function formatSimilarity(value: number): string {
  const percent = Math.round(Math.max(0, Math.min(value, 1)) * 100);

  return `${percent}%`;
}

function getPreview(content: string): string {
  return content.length > 96 ? `${content.slice(0, 96)}...` : content;
}

function isBlockingDuplicateRisk(risk: DuplicateRisk): boolean {
  return risk === "high" || risk === "medium";
}

function getDuplicateRiskLabel(risk: DuplicateRisk): string {
  if (risk === "high") {
    return "중복 가능성 높음";
  }

  if (risk === "medium") {
    return "중복 가능성 있음";
  }

  if (risk === "low") {
    return "비슷한 글 있음";
  }

  return "중복 가능성 낮음";
}

function getDuplicateRiskClassName(risk: DuplicateRisk): string {
  if (risk === "high") {
    return "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]";
  }

  if (risk === "medium") {
    return "border-[#fde68a] bg-[#fffbeb] text-[#92400e]";
  }

  return "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]";
}

function getModerationClassName(verdict: ModerationVerdict): string {
  if (verdict === "block") {
    return "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]";
  }

  if (verdict === "warn") {
    return "border-[#fde68a] bg-[#fffbeb] text-[#92400e]";
  }

  return "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]";
}

export function PostCreateForm({
  initialTitle = "",
  initialContent = "",
  initialTags = [],
}: PostCreateFormProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState(formatTags(initialTags));
  const [existingTags, setExistingTags] = useState<ExistingTag[]>([]);
  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [tagMessage, setTagMessage] = useState("");
  const [draftSimilarPosts, setDraftSimilarPosts] =
    useState<DraftSimilarPostsResponse | null>(null);
  const [isRagLoading, setIsRagLoading] = useState(false);
  const [hasRequestedRag, setHasRequestedRag] = useState(false);
  const [ragCheckedFingerprint, setRagCheckedFingerprint] = useState("");
  const [
    acknowledgedDuplicateFingerprint,
    setAcknowledgedDuplicateFingerprint,
  ] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationResult, setModerationResult] =
    useState<ModerationResult | null>(null);
  const [isModerating, setIsModerating] = useState(false);
  const [moderationCheckedFingerprint, setModerationCheckedFingerprint] =
    useState("");
  const [
    acknowledgedModerationFingerprint,
    setAcknowledgedModerationFingerprint,
  ] = useState("");

  const selectedTagNames = useMemo(() => parseTags(tags), [tags]);
  const draftFingerprint = useMemo(
    () =>
      JSON.stringify({
        title: title.trim(),
        content: content.trim(),
        tags: selectedTagNames
          .map((tag) => tag.toLowerCase())
          .sort((left, right) => left.localeCompare(right)),
      }),
    [content, selectedTagNames, title],
  );
  const moderationFingerprint = useMemo(
    () =>
      JSON.stringify({
        title: title.trim(),
        content: content.trim(),
      }),
    [content, title],
  );
  const isDuplicateCheckCurrent =
    hasRequestedRag && ragCheckedFingerprint === draftFingerprint;
  const isModerationCheckCurrent =
    moderationCheckedFingerprint === moderationFingerprint;
  const duplicateRisk = isDuplicateCheckCurrent
    ? draftSimilarPosts?.duplicateRisk ?? "none"
    : "none";
  const hasAcknowledgedDuplicateRisk =
    acknowledgedDuplicateFingerprint === draftFingerprint;
  const hasBlockingDuplicateRisk =
    isBlockingDuplicateRisk(duplicateRisk) && !hasAcknowledgedDuplicateRisk;
  const hasModerationWarning =
    isModerationCheckCurrent &&
    moderationResult?.verdict === "warn" &&
    acknowledgedModerationFingerprint !== moderationFingerprint;
  const hasModerationBlock =
    isModerationCheckCurrent && moderationResult?.verdict === "block";
  const canRunDuplicateCheck =
    title.trim().length >= 2 && content.trim().length >= 10;
  const needsDuplicateCheck =
    canRunDuplicateCheck && !isDuplicateCheckCurrent;

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

        setExistingTags(data.tags.filter((tag) => tag.counts.posts > 0));
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

    if (needsDuplicateCheck) {
      setMessage(
        "게시글 등록 전에 중복 글 확인을 먼저 진행해주세요. 비슷한 글이 없으면 바로 등록할 수 있습니다.",
      );
      return;
    }

    if (hasBlockingDuplicateRisk) {
      setMessage(
        "중복 가능성이 있는 기존 글을 먼저 확인해주세요. 확인 후에도 새 관점이 있다면 등록할 수 있습니다.",
      );
      return;
    }

    const moderation = await runModerationCheck();

    if (!moderation) {
      return;
    }

    if (moderation.verdict === "block") {
      setMessage(moderation.message);
      return;
    }

    if (
      moderation.verdict === "warn" &&
      acknowledgedModerationFingerprint !== moderationFingerprint
    ) {
      setMessage(
        "운영 정책 점검에서 주의가 필요하다고 판단했습니다. 안내를 확인한 뒤 계속 진행할 수 있습니다.",
      );
      return;
    }

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
    setMessage("초안을 작성 폼에 적용했습니다. 내용을 확인한 뒤 등록해주세요.");
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

  async function runModerationCheck(): Promise<ModerationResult | null> {
    if (isModerationCheckCurrent && moderationResult) {
      return moderationResult;
    }

    setIsModerating(true);
    setModerationResult(null);

    try {
      const response = await fetch("/api/ai/agent/moderation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          targetType: "post",
          title,
          content,
        }),
      });
      const data = (await response.json()) as ModerationResponse;

      if (!response.ok || !data.result) {
        setMessage(data.message ?? "운영 정책 점검을 실행하지 못했습니다.");
        return null;
      }

      setModerationResult(data.result);
      setModerationCheckedFingerprint(moderationFingerprint);
      setAcknowledgedModerationFingerprint("");

      return data.result;
    } catch {
      setMessage("운영 정책 점검 중 네트워크 오류가 발생했습니다.");

      return null;
    } finally {
      setIsModerating(false);
    }
  }

  async function handleFindSimilarDraftPosts() {
    setIsRagLoading(true);
    setHasRequestedRag(true);
    setDraftSimilarPosts(null);

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
          tags: selectedTagNames,
        }),
      });
      const data = (await response.json()) as DraftSimilarPostsResponse;

      setDraftSimilarPosts(data);
      setRagCheckedFingerprint(draftFingerprint);
      setAcknowledgedDuplicateFingerprint("");
    } catch {
      setDraftSimilarPosts({
        status: "unavailable",
        message: "초안과 유사한 게시글을 찾지 못했습니다.",
        summary: null,
        similarPosts: [],
        duplicateRisk: "none",
        duplicateWarning: null,
        topSimilarity: null,
      });
      setRagCheckedFingerprint(draftFingerprint);
      setAcknowledgedDuplicateFingerprint("");
    } finally {
      setIsRagLoading(false);
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

          <section className="rounded-md border border-[#d7dde8] bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#071a3d]">
                  중복 글 확인
                </p>
                <p className="mt-1 text-xs leading-5 text-[#64748b]">
                  작성 중인 제목, 본문, 태그를 기준으로 이미 비슷한 이야기가
                  올라왔는지 확인합니다.
                </p>
              </div>
              <button
                className="h-10 rounded-md bg-[#071a3d] px-4 text-sm font-bold text-white hover:bg-[#102a56] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
                disabled={
                  isRagLoading ||
                  title.trim().length < 2 ||
                  content.trim().length < 10
                }
                onClick={handleFindSimilarDraftPosts}
                type="button"
              >
                {isRagLoading
                  ? "찾는 중"
                  : hasRequestedRag
                    ? "다시 찾기"
                    : "중복 글 확인"}
              </button>
            </div>

            {!hasRequestedRag ? (
              <p className="mt-3 text-sm text-[#64748b]">
                게시글을 등록하기 전에 비슷한 주제가 이미 논의됐는지 확인할 수
                있습니다.
              </p>
            ) : null}

            {hasRequestedRag && !isDuplicateCheckCurrent ? (
              <p className="mt-3 rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
                작성 내용이 바뀌었습니다. 현재 내용 기준으로 중복 글을 다시
                확인해주세요.
              </p>
            ) : null}

            {isRagLoading ? (
              <p className="mt-3 text-sm text-[#64748b]">
                비슷한 주제의 글을 찾는 중입니다.
              </p>
            ) : null}

            {!isRagLoading && draftSimilarPosts?.message ? (
              <p className="mt-3 rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
                {draftSimilarPosts.message}
              </p>
            ) : null}

            {!isRagLoading &&
            isDuplicateCheckCurrent &&
            draftSimilarPosts?.duplicateWarning ? (
              <div
                className={`mt-3 rounded-md border px-3 py-3 text-sm ${getDuplicateRiskClassName(
                  draftSimilarPosts.duplicateRisk,
                )}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black">
                    {getDuplicateRiskLabel(draftSimilarPosts.duplicateRisk)}
                  </p>
                  {draftSimilarPosts.topSimilarity !== null ? (
                    <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-black">
                      최고 유사도{" "}
                      {formatSimilarity(draftSimilarPosts.topSimilarity)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 leading-6">
                  {draftSimilarPosts.duplicateWarning}
                </p>
                {isBlockingDuplicateRisk(draftSimilarPosts.duplicateRisk) ? (
                  <button
                    className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-black text-[#071a3d] hover:bg-[#f8fafc]"
                    onClick={() =>
                      setAcknowledgedDuplicateFingerprint(draftFingerprint)
                    }
                    type="button"
                  >
                    확인하고 등록 진행
                  </button>
                ) : null}
                {hasAcknowledgedDuplicateRisk ? (
                  <p className="mt-2 text-xs font-bold">
                    확인 완료. 새 관점이나 추가 정보가 있다면 등록할 수 있습니다.
                  </p>
                ) : null}
              </div>
            ) : null}

            {!isRagLoading && draftSimilarPosts?.summary ? (
              <div className="mt-3 rounded-md border border-[#d7dde8] bg-[#f8fafc] p-3">
                <p className="text-xs font-black uppercase text-[#64748b]">
                  요약
                </p>
                <p className="mt-2 text-sm leading-6 text-[#071a3d]">
                  {draftSimilarPosts.summary}
                </p>
              </div>
            ) : null}

            {!isRagLoading &&
            draftSimilarPosts?.status === "ready" &&
            draftSimilarPosts.similarPosts.length === 0 ? (
              <p className="mt-3 text-sm text-[#64748b]">
                아직 유사한 기존 게시글이 없습니다.
              </p>
            ) : null}

            {!isRagLoading && draftSimilarPosts?.similarPosts.length ? (
              <div className="mt-3 grid gap-3">
                {draftSimilarPosts.similarPosts.map((post) => (
                  <article
                    className="rounded-md border border-[#d7dde8] bg-[#f8fafc] p-3"
                    key={post.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        className="text-sm font-black text-[#071a3d] hover:text-[#d71920]"
                        href={`/posts/${post.id}`}
                      >
                        {post.title}
                      </Link>
                      <span className="rounded-md bg-[#fff1f2] px-2 py-1 text-xs font-black text-[#d71920]">
                        유사도 {formatSimilarity(post.similarity)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#64748b]">
                      {getPreview(post.content)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {post.tags.length > 0 ? (
                        post.tags.map((tag) => (
                          <span
                            className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#64748b]"
                            key={tag.id}
                          >
                            #{tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#64748b]">
                          태그 없음
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          {isModerating ? (
            <p className="rounded-md border border-[#d7dde8] bg-[#f8fafc] px-3 py-2 text-sm text-[#475569]">
              운영 정책을 점검하는 중입니다.
            </p>
          ) : null}

          {isModerationCheckCurrent && moderationResult ? (
            <section
              className={`rounded-md border px-3 py-3 text-sm ${getModerationClassName(
                moderationResult.verdict,
              )}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black">운영 정책 점검</p>
                <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-black">
                  {moderationResult.verdict === "allow"
                    ? "통과"
                    : moderationResult.verdict === "warn"
                      ? "주의"
                      : "등록 제한"}
                </span>
              </div>
              <p className="mt-2 leading-6">{moderationResult.message}</p>
              {moderationResult.reasons.length > 0 ? (
                <ul className="mt-2 grid gap-1 leading-6">
                  {moderationResult.reasons.map((reason) => (
                    <li key={reason}>- {reason}</li>
                  ))}
                </ul>
              ) : null}
              {moderationResult.suggestions.length > 0 ? (
                <div className="mt-2 border-t border-current/20 pt-2">
                  <p className="font-black">수정 제안</p>
                  <ul className="mt-1 grid gap-1 leading-6">
                    {moderationResult.suggestions.map((suggestion) => (
                      <li key={suggestion}>- {suggestion}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {moderationResult.verdict === "warn" ? (
                <button
                  className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-black text-[#071a3d] hover:bg-[#f8fafc]"
                  onClick={() =>
                    setAcknowledgedModerationFingerprint(moderationFingerprint)
                  }
                  type="button"
                >
                  확인하고 등록 진행
                </button>
              ) : null}
              {acknowledgedModerationFingerprint === moderationFingerprint &&
              moderationResult.verdict === "warn" ? (
                <p className="mt-2 text-xs font-bold">
                  확인 완료. 현재 표현으로 등록을 계속 진행할 수 있습니다.
                </p>
              ) : null}
            </section>
          ) : null}

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

          {needsDuplicateCheck ? (
            <p className="rounded-md border border-[#d7dde8] bg-[#f8fafc] px-3 py-2 text-sm text-[#475569]">
              게시글 등록 전 현재 내용 기준으로 중복 글 확인을 진행해주세요.
            </p>
          ) : null}

          {hasBlockingDuplicateRisk ? (
            <p className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
              중복 가능성이 있는 글을 확인한 뒤 확인하고 등록 진행을 눌러주세요.
            </p>
          ) : null}

          {hasModerationWarning ? (
            <p className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
              운영 정책 점검 안내를 확인한 뒤 확인하고 등록 진행을 눌러주세요.
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
              disabled={
                isSubmitting ||
                isModerating ||
                hasBlockingDuplicateRisk ||
                hasModerationWarning ||
                hasModerationBlock
              }
              type="submit"
            >
              {isSubmitting || isModerating ? "처리 중" : "게시글 등록"}
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { PostImageUploader } from "@/components/posts/post-image-uploader";
import {
  extractPostImageAttachments,
  POST_CONTENT_MAX_LENGTH,
  serializePostContent,
  type PostImageAttachment,
} from "@/lib/posts/content";

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

function getModerationClassName(verdict: ModerationVerdict): string {
  if (verdict === "block") {
    return "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]";
  }

  if (verdict === "warn") {
    return "border-[#fde68a] bg-[#fffbeb] text-[#92400e]";
  }

  return "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]";
}

export function PostEditForm({ postId }: PostEditFormProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageAttachments, setImageAttachments] = useState<
    PostImageAttachment[]
  >([]);
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [moderationResult, setModerationResult] =
    useState<ModerationResult | null>(null);
  const [moderationCheckedFingerprint, setModerationCheckedFingerprint] =
    useState("");
  const [
    acknowledgedModerationFingerprint,
    setAcknowledgedModerationFingerprint,
  ] = useState("");
  const [message, setMessage] = useState("");

  const moderationFingerprint = useMemo(
    () =>
      JSON.stringify({
        title: title.trim(),
        content: content.trim(),
      }),
    [content, title],
  );
  const isModerationCheckCurrent =
    moderationCheckedFingerprint === moderationFingerprint;
  const hasModerationWarning =
    isModerationCheckCurrent &&
    moderationResult?.verdict === "warn" &&
    acknowledgedModerationFingerprint !== moderationFingerprint;
  const hasModerationBlock =
    isModerationCheckCurrent && moderationResult?.verdict === "block";

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
        const parsedContent = extractPostImageAttachments(postData.post.content);
        setContent(parsedContent.text);
        setImageAttachments(parsedContent.attachments);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!post) {
      return;
    }

    setMessage("");

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
      setMessage("운영 정책 점검 안내를 확인한 뒤 다시 저장해주세요.");
      return;
    }

    const contentWithAttachments = serializePostContent(
      content,
      imageAttachments,
    );

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
          content: contentWithAttachments,
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

  if (!currentUser || currentUser.id !== post.authorId) {
    return (
      <section className="page-shell">
        <div className="community-panel p-6">
          <h2 className="text-xl font-black text-[#071a3d]">
            수정 권한이 없습니다.
          </h2>
          <p className="mt-2 text-sm text-[#667085]">
            게시글 작성자만 이 글을 수정할 수 있습니다.
          </p>
          <Link
            className="community-button-primary mt-5"
            href={`/posts/${post.id}`}
          >
            상세로 돌아가기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <form
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
        onSubmit={handleSubmit}
      >
        <div className="community-panel min-w-0">
          <div className="community-panel-header">
            <div>
              <h2 className="text-base font-black text-[#071a3d]">
                게시글 수정
              </h2>
              <p className="mt-0.5 text-[11px] text-[#667085]">
                제목, 본문, 태그를 수정한 뒤 저장할 수 있습니다.
              </p>
            </div>
            <Link
              className="community-button-secondary community-button-compact"
              href={`/posts/${post.id}`}
            >
              상세로
            </Link>
          </div>

          <div className="grid gap-5 p-5 sm:p-6">
            <label className="community-subpanel grid gap-2 bg-[#fbfcfe] p-4">
              <span className="text-sm font-semibold text-[#172033]">제목</span>
              <input
                className="community-input community-input-large text-sm"
                maxLength={120}
                minLength={2}
                onChange={(event) => setTitle(event.target.value)}
                required
                type="text"
                value={title}
              />
            </label>

            <section className="community-subpanel grid gap-3 bg-[#fbfcfe] p-4">
              <span className="text-sm font-semibold text-[#172033]">
                본문
              </span>
              <textarea
                className="community-textarea min-h-72 resize-y text-sm leading-6"
                maxLength={POST_CONTENT_MAX_LENGTH}
                onChange={(event) => setContent(event.target.value)}
                required
                value={content}
              />
              <PostImageUploader
                attachments={imageAttachments}
                contentLength={content.length}
                disabled={isSubmitting || isModerating}
                onChange={setImageAttachments}
              />
            </section>

            <label className="community-subpanel grid gap-2 bg-[#fbfcfe] p-4">
              <span className="text-sm font-semibold text-[#172033]">태그</span>
              <input
                className="community-input community-input-large text-sm"
                onChange={(event) => setTags(event.target.value)}
                placeholder="kbo, 불펜, 경기리뷰"
                type="text"
                value={tags}
              />
            </label>

            {message ? (
              <p className="rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
                {message}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-[#d8deea] pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Link
                className="community-button-secondary w-full sm:w-auto"
                href={`/posts/${post.id}`}
              >
                취소
              </Link>
              <button
                className="community-button-primary w-full disabled:cursor-not-allowed disabled:bg-[#94a3b8] sm:w-auto"
                disabled={
                  isSubmitting ||
                  isModerating ||
                  hasModerationWarning ||
                  hasModerationBlock
                }
                type="submit"
              >
                {isSubmitting || isModerating ? "처리 중" : "수정 저장"}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <section className="community-panel">
            <div className="community-panel-header">
              <h3 className="text-sm font-black text-[#071a3d]">수정 안내</h3>
              <span className="text-[11px] font-bold text-[#667085]">
                저장 전 확인
              </span>
            </div>
            <div className="grid gap-3 px-3 py-3 text-sm leading-6 text-[#667085]">
              <p className="community-subpanel p-3">
                태그는 쉼표로 구분해서 입력합니다. 너무 많은 태그보다 핵심 팀,
                경기, 선수 중심으로 정리하는 편이 읽기 좋습니다.
              </p>
              <p className="community-subpanel p-3">
                경기 흐름을 바꾸는 장면, 결정적인 타석, 투수 운영 포인트가 보이게
                다듬으면 글이 더 잘 읽힙니다.
              </p>
            </div>
          </section>

          {isModerating ? (
            <p className="rounded-sm border border-[#d7dde8] bg-[#f8fafc] px-3 py-2 text-sm text-[#475569]">
              운영 정책을 점검하는 중입니다.
            </p>
          ) : null}

          {isModerationCheckCurrent && moderationResult ? (
            <section
              className={`rounded-sm border px-3 py-3 text-sm ${getModerationClassName(
                moderationResult.verdict,
              )}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black">운영 정책 점검</p>
                <span className="rounded-sm bg-white/70 px-2 py-1 text-xs font-black">
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
                  className="community-button-secondary community-button-compact mt-3"
                  onClick={() =>
                    setAcknowledgedModerationFingerprint(moderationFingerprint)
                  }
                  type="button"
                >
                  확인하고 저장 진행
                </button>
              ) : null}
            </section>
          ) : null}
        </aside>
      </form>
    </section>
  );
}

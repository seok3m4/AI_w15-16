import { FormEvent, useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  chatbubbleOutline,
  flagOutline,
  heart,
  heartOutline,
  sendOutline,
  trashOutline,
} from "ionicons/icons";

import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  fetchPost,
  fetchPosts,
  fetchTags,
  likePost,
  parseTags,
  reportComment,
  reportPost,
  unlikePost,
  type BoardCategory,
  type BoardComment,
  type BoardFeedResponse,
  type BoardPostDetail,
  type BoardPostSummary,
  type BoardTag,
} from "../api/posts";
import {
  hardDeleteAdminComment,
  hardDeleteAdminPost,
  hideAdminComment,
  hideAdminPost,
} from "../../admin/api/admin";
import type { CurrentUser } from "../../../api/backend";
import { useI18n } from "../../../i18n/I18nProvider";

import "./DiscussionBoard.css";

interface DiscussionBoardProps {
  currentUser: CurrentUser | null;
  initialPostId?: number | null;
  initialCommentId?: number | null;
  targetVersion?: number;
}

const CATEGORIES = [
  { id: "all", labelKey: "discussion.category.all" },
  { id: "inflation", labelKey: "discussion.category.inflation" },
  { id: "jobs", labelKey: "discussion.category.jobs" },
  { id: "rates", labelKey: "discussion.category.rates" },
  { id: "fx", labelKey: "discussion.category.fx" },
  { id: "markets", labelKey: "discussion.category.markets" },
  { id: "commodities", labelKey: "discussion.category.commodities" },
  { id: "korea", labelKey: "discussion.category.korea" },
  { id: "question", labelKey: "discussion.category.question" },
  { id: "general", labelKey: "discussion.category.general" },
] as const;

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.filter((item) => item.id !== "all").map((item) => [item.id, item.labelKey]),
) as Record<BoardCategory, (typeof CATEGORIES)[number]["labelKey"]>;

const FEED_PAGE_SIZE = 2;
const COLLAPSED_COMMENT_LENGTH = 130;

function formatDateTime(value: string, locale: string, fallback: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function profileInitial(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function isAiSample(title: string, content = "") {
  return title.includes("[AI 생성 샘플]") || content.includes("AI가 생성한 샘플 토론 데이터입니다.");
}

function isAiComment(comment: BoardComment) {
  return comment.content.includes("AI가 작성한 샘플 댓글입니다.") || comment.authorProfile.nickname.startsWith("AI_");
}

function commentsPerPageForViewport(height: number, width: number) {
  if (width <= 720) {
    return height < 860 ? 1 : 2;
  }
  if (height < 760) {
    return 1;
  }
  if (height < 920) {
    return 2;
  }
  if (height < 1100) {
    return 3;
  }
  return 4;
}

function initialCommentsPerPage() {
  if (typeof window === "undefined") {
    return 2;
  }
  return commentsPerPageForViewport(window.innerHeight, window.innerWidth);
}

function isLongComment(content: string) {
  return content.length > COLLAPSED_COMMENT_LENGTH || content.split(/\r?\n/).length > 2;
}

export default function DiscussionBoard({
  currentUser,
  initialPostId,
  initialCommentId,
  targetVersion = 0,
}: DiscussionBoardProps) {
  const { locale, t } = useI18n();
  const [feed, setFeed] = useState<BoardFeedResponse | null>(null);
  const [selectedPost, setSelectedPost] = useState<BoardPostDetail | null>(null);
  const [tags, setTags] = useState<BoardTag[]>([]);
  const [category, setCategory] = useState<BoardCategory | "all">("all");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [postCategoryDraft, setPostCategoryDraft] = useState<BoardCategory>("general");
  const [commentDraft, setCommentDraft] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [commentsPerPage, setCommentsPerPage] = useState(initialCommentsPerPage);
  const [commentPage, setCommentPage] = useState(0);
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<number>>(() => new Set());

  const isAdmin = currentUser?.roles.includes("ROLE_ADMIN") ?? false;
  const selectedPostId = selectedPost?.id ?? null;
  const selectedCommentCount = selectedPost?.comments.length ?? 0;
  const commentTotalPages = Math.max(1, Math.ceil(selectedCommentCount / commentsPerPage));
  const safeCommentPage = Math.min(commentPage, commentTotalPages - 1);
  const visibleComments = selectedPost?.comments.slice(
    safeCommentPage * commentsPerPage,
    safeCommentPage * commentsPerPage + commentsPerPage,
  ) ?? [];

  useEffect(() => {
    let cancelled = false;
    async function loadTags() {
      try {
        const nextTags = await fetchTags();
        if (!cancelled) {
          setTags(nextTags);
        }
      } catch {
        if (!cancelled) {
          setTags([]);
        }
      }
    }
    void loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function updateCommentsPerPage() {
      setCommentsPerPage(commentsPerPageForViewport(window.innerHeight, window.innerWidth));
    }

    updateCommentsPerPage();
    window.addEventListener("resize", updateCommentsPerPage);
    return () => window.removeEventListener("resize", updateCommentsPerPage);
  }, []);

  useEffect(() => {
    setCommentPage(0);
    setExpandedCommentIds(new Set());
  }, [selectedPostId]);

  useEffect(() => {
    setCommentPage((current) => Math.min(current, commentTotalPages - 1));
  }, [commentTotalPages]);

  useEffect(() => {
    let cancelled = false;
    async function loadFeed() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const nextFeed = await fetchPosts({
          category,
          query,
          tag,
          sort,
          page,
          size: FEED_PAGE_SIZE,
        });
        if (cancelled) {
          return;
        }
        setFeed(nextFeed);
        let nextSelectedId = initialPostId ?? nextFeed.items[0]?.id;
        if (!initialPostId && selectedPostId && nextFeed.items.some((item) => item.id === selectedPostId)) {
          nextSelectedId = selectedPostId;
        }
        if (nextSelectedId) {
          const detail = await fetchPost(nextSelectedId);
          if (!cancelled) {
            setSelectedPost(detail);
          }
        } else {
          setSelectedPost(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : t("discussion.error.feed"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadFeed();
    return () => {
      cancelled = true;
    };
  }, [category, initialPostId, page, query, selectedPostId, sort, tag]);

  useEffect(() => {
    if (!initialCommentId || !initialPostId || selectedPost?.id !== initialPostId) {
      return;
    }

    const hasTargetComment = selectedPost.comments.some(
      (comment) => comment.id === initialCommentId
        || comment.replies.some((reply) => reply.id === initialCommentId),
    );
    if (!hasTargetComment) {
      return;
    }

    setHighlightedCommentId(initialCommentId);
    const scrollTimer = window.setTimeout(() => {
      document
        .getElementById(`discussion-comment-${initialCommentId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    const clearTimer = window.setTimeout(() => {
      setHighlightedCommentId((current) => current === initialCommentId ? null : current);
    }, 4500);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [initialCommentId, initialPostId, selectedPost, targetVersion]);

  async function reloadFeed(preferredPostId?: number | null) {
    const nextFeed = await fetchPosts({ category, query, tag, sort, page, size: FEED_PAGE_SIZE });
    setFeed(nextFeed);
    const nextId =
      preferredPostId && nextFeed.items.some((item) => item.id === preferredPostId)
        ? preferredPostId
        : nextFeed.items[0]?.id;
    setSelectedPost(nextId ? await fetchPost(nextId) : null);
  }

  async function refreshSelected(postId = selectedPost?.id) {
    if (!postId) {
      return;
    }
    setSelectedPost(await fetchPost(postId));
  }

  function requireLogin() {
    if (currentUser) {
      return true;
    }
    setErrorMessage(t("discussion.error.login"));
    return false;
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireLogin()) {
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const created = await createPost({
        category: postCategoryDraft,
        title: titleDraft,
        content: contentDraft,
        tags: parseTags(tagDraft),
      });
      setTitleDraft("");
      setContentDraft("");
      setTagDraft("");
      setPostCategoryDraft("general");
      await reloadFeed(created.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("discussion.error.save"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectPost(post: BoardPostSummary) {
    try {
      setErrorMessage(null);
      setSelectedPost(await fetchPost(post.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("discussion.error.post"));
    }
  }

  async function handleLike() {
    if (!selectedPost || !requireLogin()) {
      return;
    }
    try {
      const response = selectedPost.likedByMe
        ? await unlikePost(selectedPost.id)
        : await likePost(selectedPost.id);
      setSelectedPost({
        ...selectedPost,
        likeCount: response.likeCount,
        likedByMe: response.likedByMe,
      });
      setFeed((current) => current && {
        ...current,
        items: current.items.map((item) =>
          item.id === selectedPost.id
            ? { ...item, likeCount: response.likeCount, likedByMe: response.likedByMe }
            : item,
        ),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("discussion.error.like"));
    }
  }

  async function handleComment(parentCommentId?: number) {
    if (!selectedPost || !requireLogin()) {
      return;
    }
    const content = parentCommentId ? replyDraft : commentDraft;
    if (!content.trim()) {
      return;
    }
    try {
      setIsSubmitting(true);
      await createComment(selectedPost.id, content.trim(), parentCommentId);
      setCommentDraft("");
      setReplyDraft("");
      setReplyTargetId(null);
      await refreshSelected(selectedPost.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("discussion.error.comment"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePost() {
    if (!selectedPost || !requireLogin()) {
      return;
    }
    if (!window.confirm(t("discussion.deletePostConfirm"))) {
      return;
    }
    await deletePost(selectedPost.id);
    await reloadFeed(null);
  }

  async function handleDeleteComment(commentId: number) {
    if (!selectedPost || !requireLogin()) {
      return;
    }
    if (!window.confirm(t("discussion.deleteCommentConfirm"))) {
      return;
    }
    await deleteComment(selectedPost.id, commentId);
    await refreshSelected(selectedPost.id);
  }

  async function handleAdminHidePost() {
    if (!selectedPost || !isAdmin) {
      return;
    }
    if (!window.confirm("이 토론글을 숨김 처리할까요? 일반 사용자 화면과 RAG 검색에서 제외됩니다.")) {
      return;
    }
    await hideAdminPost(selectedPost.id);
    await reloadFeed(null);
    setErrorMessage("토론글을 숨김 처리했습니다.");
  }

  async function handleAdminHardDeletePost() {
    if (!selectedPost || !isAdmin) {
      return;
    }
    if (!window.confirm("이 토론글을 영구삭제할까요? 댓글, 신고, 알림, RAG 데이터도 함께 삭제됩니다.")) {
      return;
    }
    await hardDeleteAdminPost(selectedPost.id);
    await reloadFeed(null);
    setErrorMessage("토론글을 영구삭제했습니다.");
  }

  async function handleAdminHideComment(commentId: number) {
    if (!selectedPost || !isAdmin) {
      return;
    }
    if (!window.confirm("이 댓글을 숨김 처리할까요?")) {
      return;
    }
    await hideAdminComment(commentId);
    await refreshSelected(selectedPost.id);
    setErrorMessage("댓글을 숨김 처리했습니다.");
  }

  async function handleAdminHardDeleteComment(commentId: number) {
    if (!selectedPost || !isAdmin) {
      return;
    }
    if (!window.confirm("이 댓글을 영구삭제할까요? 관련 신고와 알림도 함께 삭제됩니다.")) {
      return;
    }
    await hardDeleteAdminComment(commentId);
    await refreshSelected(selectedPost.id);
    setErrorMessage("댓글을 영구삭제했습니다.");
  }

  async function handleReportPost() {
    if (!selectedPost || !requireLogin()) {
      return;
    }
    const detail = window.prompt(t("discussion.reportPrompt"));
    if (detail === null) {
      return;
    }
    await reportPost(selectedPost.id, "user_report", detail);
    setErrorMessage(t("discussion.reportReceived"));
  }

  async function handleReportComment(commentId: number) {
    if (!selectedPost || !requireLogin()) {
      return;
    }
    const detail = window.prompt(t("discussion.reportPrompt"));
    if (detail === null) {
      return;
    }
    await reportComment(selectedPost.id, commentId, "user_report", detail);
    setErrorMessage(t("discussion.reportReceived"));
  }

  function renderAuthor(profile: BoardPostDetail["authorProfile"] | BoardComment["authorProfile"]) {
    return (
      <span className="discussion-author">
        {profile.avatarUrl ? <img alt="" src={profile.avatarUrl} /> : <span>{profileInitial(profile.nickname)}</span>}
        <strong>{profile.nickname}</strong>
      </span>
    );
  }

  function toggleCommentExpanded(commentId: number) {
    setExpandedCommentIds((current) => {
      const next = new Set(current);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }

  function renderCommentBody(comment: BoardComment) {
    const longComment = isLongComment(comment.content);
    const expanded = expandedCommentIds.has(comment.id);
    return (
      <>
        <p className={longComment && !expanded ? "discussion-comment__body is-collapsed" : "discussion-comment__body"}>
          {comment.content}
        </p>
        {longComment && (
          <button className="discussion-comment__more" type="button" onClick={() => toggleCommentExpanded(comment.id)}>
            {expanded ? t("discussion.showLess") : t("discussion.showMore")}
          </button>
        )}
      </>
    );
  }

  function renderComment(comment: BoardComment) {
    const ownsComment = currentUser?.id === comment.authorProfile.userId;
    const aiComment = isAiComment(comment);
    return (
      <article
        className={comment.id === highlightedCommentId ? "discussion-comment is-highlighted" : "discussion-comment"}
        id={`discussion-comment-${comment.id}`}
        key={comment.id}
      >
        <header>
          {renderAuthor(comment.authorProfile)}
          <span className="discussion-comment-meta">
            {aiComment && <em className="discussion-ai-badge">{t("discussion.aiCommentBadge")}</em>}
            <time>{formatDateTime(comment.createdAt, locale, t("discussion.justNow"))}</time>
          </span>
        </header>
        {renderCommentBody(comment)}
        <div className="discussion-comment__actions">
          <button type="button" onClick={() => setReplyTargetId(comment.id)}>
            {t("discussion.reply")}
          </button>
          {isAdmin ? (
            <>
              <button type="button" onClick={() => void handleAdminHideComment(comment.id)}>
                숨김처리
              </button>
              <button type="button" onClick={() => void handleAdminHardDeleteComment(comment.id)}>
                영구삭제
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => void handleReportComment(comment.id)}>
                {t("discussion.report")}
              </button>
              {ownsComment && (
                <button type="button" onClick={() => void handleDeleteComment(comment.id)}>
                  {t("discussion.hide")}
                </button>
              )}
            </>
          )}
        </div>
        {replyTargetId === comment.id && (
          <div className="discussion-reply-box">
            <input
              placeholder={t("discussion.replyPlaceholder")}
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
            />
            <button disabled={isSubmitting} type="button" onClick={() => void handleComment(comment.id)}>
              <IonIcon icon={sendOutline} />
            </button>
          </div>
        )}
        {comment.replies.length > 0 && (
          <div className="discussion-replies">
            {comment.replies.map((reply) => {
              const ownsReply = currentUser?.id === reply.authorProfile.userId;
              const aiReply = isAiComment(reply);
              return (
                <article
                  className={
                    reply.id === highlightedCommentId
                      ? "discussion-comment is-reply is-highlighted"
                      : "discussion-comment is-reply"
                  }
                  id={`discussion-comment-${reply.id}`}
                  key={reply.id}
                >
                  <header>
                    {renderAuthor(reply.authorProfile)}
                    <span className="discussion-comment-meta">
                      {aiReply && <em className="discussion-ai-badge">{t("discussion.aiCommentBadge")}</em>}
                      <time>{formatDateTime(reply.createdAt, locale, t("discussion.justNow"))}</time>
                    </span>
                  </header>
                  {renderCommentBody(reply)}
                  <div className="discussion-comment__actions">
                    {isAdmin ? (
                      <>
                        <button type="button" onClick={() => void handleAdminHideComment(reply.id)}>
                          숨김처리
                        </button>
                        <button type="button" onClick={() => void handleAdminHardDeleteComment(reply.id)}>
                          영구삭제
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => void handleReportComment(reply.id)}>
                          {t("discussion.report")}
                        </button>
                        {ownsReply && (
                          <button type="button" onClick={() => void handleDeleteComment(reply.id)}>
                            {t("discussion.hide")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </article>
    );
  }
  return (
    <section className="discussion-workbench" aria-label={t("discussion.aria.workbench")}>
      {errorMessage && <p className="discussion-message">{errorMessage}</p>}

      <section className="discussion-layout">
        <aside className="discussion-feed">
          <div className="discussion-toolbar">
            <div className="discussion-categories" aria-label={t("discussion.aria.category")}>
              {CATEGORIES.map((item) => (
                <button
                  className={category === item.id ? "is-active" : ""}
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategory(item.id);
                    setPage(0);
                  }}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
            <div className="discussion-filters">
              <input
                placeholder={t("discussion.searchPlaceholder")}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
              />
              <select
                value={tag ?? ""}
                onChange={(event) => {
                  setTag(event.target.value || null);
                  setPage(0);
                }}
              >
                <option value="">{t("discussion.tags.all")}</option>
                {tags.map((item) => (
                  <option key={item.id} value={item.name}>
                    #{item.name}
                  </option>
                ))}
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value as "latest" | "popular")}>
                <option value="latest">{t("discussion.sort.latest")}</option>
                <option value="popular">{t("discussion.sort.popular")}</option>
              </select>
            </div>
          </div>

          <form className="discussion-composer" onSubmit={(event) => void handleCreatePost(event)}>
            <select
              value={postCategoryDraft}
              onChange={(event) => setPostCategoryDraft(event.target.value as BoardCategory)}
            >
              {CATEGORIES.filter((item) => item.id !== "all").map((item) => (
                <option key={item.id} value={item.id}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
            <input
              placeholder={t("discussion.composerTitle")}
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
            />
            <textarea
              placeholder={currentUser ? t("discussion.composerContent") : t("discussion.composerContentLogin")}
              rows={4}
              value={contentDraft}
              onChange={(event) => setContentDraft(event.target.value)}
            />
            <input
              placeholder={t("discussion.composerTags")}
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
            />
            <button disabled={isSubmitting || !titleDraft.trim() || !contentDraft.trim()} type="submit">
              <IonIcon icon={sendOutline} />
              <span>{t("discussion.submit")}</span>
            </button>
          </form>

          <div className="discussion-list" aria-live="polite">
            {isLoading && <p className="discussion-empty">{t("discussion.loading")}</p>}
            {!isLoading && feed?.items.length === 0 && <p className="discussion-empty">{t("discussion.empty")}</p>}
            {feed?.items.map((post) => (
              <button
                className={[
                  "discussion-post",
                  selectedPost?.id === post.id ? "is-active" : "",
                  post.deleted ? "is-deleted" : "",
                ].filter(Boolean).join(" ")}
                key={post.id}
                type="button"
                onClick={() => void handleSelectPost(post)}
              >
                <span>{t(CATEGORY_LABELS[post.category])}</span>
                {!post.deleted && isAiSample(post.title) && <em className="discussion-ai-badge">{t("discussion.aiSample")}</em>}
                <strong>{post.title}</strong>
                <p>{post.excerpt}</p>
                <footer>
                  <small>{post.authorProfile.nickname}</small>
                  <small>
                    {post.likeCount} {t("discussion.likes")} · {post.commentCount} {t("discussion.comments")}
                  </small>
                </footer>
              </button>
            ))}
          </div>

          {feed && feed.totalPages > 1 && (
            <div className="discussion-pager">
              <button disabled={page === 0} type="button" onClick={() => setPage((value) => Math.max(0, value - 1))}>
                {t("discussion.prev")}
              </button>
              <span>
                {page + 1} / {feed.totalPages}
              </span>
              <button
                disabled={page + 1 >= feed.totalPages}
                type="button"
                onClick={() => setPage((value) => value + 1)}
              >
                {t("discussion.next")}
              </button>
            </div>
          )}
        </aside>

        <section className="discussion-detail">
          {selectedPost ? (
            <>
              <article className={selectedPost.deleted ? "discussion-detail__post is-deleted" : "discussion-detail__post"}>
                <header>
                  <div>
                    <span>{t(CATEGORY_LABELS[selectedPost.category])}</span>
                    {!selectedPost.deleted && isAiSample(selectedPost.title, selectedPost.content) && (
                      <em className="discussion-ai-badge">{t("discussion.aiSample")}</em>
                    )}
                    <h2>{selectedPost.title}</h2>
                  </div>
                  {renderAuthor(selectedPost.authorProfile)}
                </header>
                <p>{selectedPost.content}</p>
                {!selectedPost.deleted && (
                  <div className="discussion-tags">
                    {selectedPost.tags.map((item) => (
                      <button key={item} type="button" onClick={() => setTag(item)}>
                        #{item}
                      </button>
                    ))}
                  </div>
                )}
                <footer>
                  {isAdmin ? (
                    <>
                      {!selectedPost.deleted && (
                        <button type="button" onClick={() => void handleAdminHidePost()}>
                          숨김처리
                        </button>
                      )}
                      <button type="button" onClick={() => void handleAdminHardDeletePost()}>
                        <IonIcon icon={trashOutline} />
                        <span>영구삭제</span>
                      </button>
                    </>
                  ) : !selectedPost.deleted ? (
                    <>
                      <button type="button" onClick={() => void handleLike()}>
                        <IonIcon icon={selectedPost.likedByMe ? heart : heartOutline} />
                        <span>{selectedPost.likeCount}</span>
                      </button>
                      <button type="button" onClick={() => void handleReportPost()}>
                        <IonIcon icon={flagOutline} />
                        <span>{t("discussion.report")}</span>
                      </button>
                      {currentUser?.id === selectedPost.authorProfile.userId && (
                        <button type="button" onClick={() => void handleDeletePost()}>
                          <IonIcon icon={trashOutline} />
                          <span>{t("discussion.hide")}</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <span>댓글은 계속 확인할 수 있습니다.</span>
                  )}
                  <time>{formatDateTime(selectedPost.createdAt, locale, t("discussion.justNow"))}</time>
                </footer>
              </article>

              <section className="discussion-comments" aria-label={t("discussion.aria.comments")}>
                <div className="discussion-section-title">
                  <strong>
                    <IonIcon icon={chatbubbleOutline} />
                    {t("discussion.comments")} {selectedPost.commentCount}
                  </strong>
                </div>
                {!selectedPost.deleted && (
                  <div className="discussion-comment-box">
                    <input
                      placeholder={currentUser ? t("discussion.commentPlaceholder") : t("discussion.commentPlaceholderLogin")}
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                    />
                    <button disabled={isSubmitting || !commentDraft.trim()} type="button" onClick={() => void handleComment()}>
                      <IonIcon icon={sendOutline} />
                    </button>
                  </div>
                )}
                <div className="discussion-comment-list">
                  {selectedPost.comments.length === 0 ? (
                    <p className="discussion-empty">{t("discussion.firstComment")}</p>
                  ) : (
                    visibleComments.map((comment) => renderComment(comment))
                  )}
                </div>
                {selectedPost.comments.length > commentsPerPage && (
                  <div className="discussion-comment-pager" aria-label={t("discussion.aria.commentPagination")}>
                    <button
                      disabled={safeCommentPage === 0}
                      type="button"
                      onClick={() => setCommentPage(Math.max(0, safeCommentPage - 1))}
                    >
                      {t("discussion.prev")}
                    </button>
                    <span>
                      {safeCommentPage + 1} / {commentTotalPages}
                    </span>
                    <button
                      disabled={safeCommentPage + 1 >= commentTotalPages}
                      type="button"
                      onClick={() => setCommentPage(Math.min(commentTotalPages - 1, safeCommentPage + 1))}
                    >
                      {t("discussion.next")}
                    </button>
                  </div>
                )}
              </section>
            </>
          ) : (
            <p className="discussion-empty">{t("discussion.selectPost")}</p>
          )}
        </section>

      </section>
    </section>
  );
}

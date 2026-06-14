import { FormEvent, useEffect, useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  chatbubbleOutline,
  flagOutline,
  heart,
  heartOutline,
  logInOutline,
  notificationsOutline,
  sendOutline,
  trashOutline,
} from "ionicons/icons";

import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  fetchBoardNotifications,
  fetchPost,
  fetchPosts,
  fetchTags,
  likePost,
  markBoardNotificationsRead,
  parseTags,
  reportComment,
  reportPost,
  unlikePost,
  type BoardCategory,
  type BoardComment,
  type BoardFeedResponse,
  type BoardNotificationItem,
  type BoardPostDetail,
  type BoardPostSummary,
  type BoardTag,
} from "../api/posts";
import { getGoogleLoginUrl } from "../../auth/api/authApi";
import type { CurrentUser } from "../../../api/backend";
import { useI18n } from "../../../i18n/I18nProvider";

import "./DiscussionBoard.css";

interface DiscussionBoardProps {
  currentUser: CurrentUser | null;
  onUnreadCountChange: (count: number) => void;
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

export default function DiscussionBoard({ currentUser, onUnreadCountChange }: DiscussionBoardProps) {
  const { locale, t } = useI18n();
  const [feed, setFeed] = useState<BoardFeedResponse | null>(null);
  const [selectedPost, setSelectedPost] = useState<BoardPostDetail | null>(null);
  const [tags, setTags] = useState<BoardTag[]>([]);
  const [notifications, setNotifications] = useState<BoardNotificationItem[]>([]);
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

  const selectedPostId = selectedPost?.id ?? null;
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

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
    let cancelled = false;
    async function loadNotifications() {
      if (!currentUser) {
        setNotifications([]);
        onUnreadCountChange(0);
        return;
      }
      try {
        const response = await fetchBoardNotifications();
        if (!cancelled) {
          setNotifications(response.items);
          onUnreadCountChange(response.unreadCount);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          onUnreadCountChange(0);
        }
      }
    }
    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [currentUser, onUnreadCountChange]);

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
          size: 10,
        });
        if (cancelled) {
          return;
        }
        setFeed(nextFeed);
        const nextSelectedId =
          selectedPostId && nextFeed.items.some((item) => item.id === selectedPostId)
            ? selectedPostId
            : nextFeed.items[0]?.id;
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
  }, [category, page, query, selectedPostId, sort, tag]);

  async function reloadFeed(preferredPostId?: number | null) {
    const nextFeed = await fetchPosts({ category, query, tag, sort, page, size: 10 });
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
      await reloadNotifications();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("discussion.error.comment"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reloadNotifications() {
    if (!currentUser) {
      return;
    }
    const response = await fetchBoardNotifications();
    setNotifications(response.items);
    onUnreadCountChange(response.unreadCount);
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

  async function handleReadNotifications() {
    if (!currentUser) {
      return;
    }
    await markBoardNotificationsRead();
    await reloadNotifications();
  }

  function renderAuthor(profile: BoardPostDetail["authorProfile"] | BoardComment["authorProfile"]) {
    return (
      <span className="discussion-author">
        {profile.avatarUrl ? <img alt="" src={profile.avatarUrl} /> : <span>{profileInitial(profile.nickname)}</span>}
        <strong>{profile.nickname}</strong>
      </span>
    );
  }

  function renderComment(comment: BoardComment) {
    const ownsComment = currentUser?.id === comment.authorProfile.userId;
    return (
      <article className="discussion-comment" key={comment.id}>
        <header>
          {renderAuthor(comment.authorProfile)}
          <time>{formatDateTime(comment.createdAt, locale, t("discussion.justNow"))}</time>
        </header>
        <p>{comment.content}</p>
        <div className="discussion-comment__actions">
          <button type="button" onClick={() => setReplyTargetId(comment.id)}>
            {t("discussion.reply")}
          </button>
          <button type="button" onClick={() => void handleReportComment(comment.id)}>
            {t("discussion.report")}
          </button>
          {ownsComment && (
            <button type="button" onClick={() => void handleDeleteComment(comment.id)}>
              {t("discussion.hide")}
            </button>
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
              return (
                <article className="discussion-comment is-reply" key={reply.id}>
                  <header>
                    {renderAuthor(reply.authorProfile)}
                    <time>{formatDateTime(reply.createdAt, locale, t("discussion.justNow"))}</time>
                  </header>
                  <p>{reply.content}</p>
                  <div className="discussion-comment__actions">
                    <button type="button" onClick={() => void handleReportComment(reply.id)}>
                      {t("discussion.report")}
                    </button>
                    {ownsReply && (
                      <button type="button" onClick={() => void handleDeleteComment(reply.id)}>
                        {t("discussion.hide")}
                      </button>
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
      <header className="discussion-hero">
        <div>
          <span>{t("discussion.heroKicker")}</span>
          <h1>{t("discussion.heroTitle")}</h1>
          <p>{t("discussion.heroSubtitle")}</p>
        </div>
        {!currentUser ? (
          <a className="discussion-login" href={getGoogleLoginUrl()}>
            <IonIcon icon={logInOutline} />
            <span>{t("discussion.login")}</span>
          </a>
        ) : (
          <button className="discussion-login" type="button" onClick={() => void handleReadNotifications()}>
            <IonIcon icon={notificationsOutline} />
            <span>{unreadCount > 0 ? `${unreadCount}${t("discussion.unreadSuffix")}` : t("discussion.noAlerts")}</span>
          </button>
        )}
      </header>

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
                className={selectedPost?.id === post.id ? "discussion-post is-active" : "discussion-post"}
                key={post.id}
                type="button"
                onClick={() => void handleSelectPost(post)}
              >
                <span>{t(CATEGORY_LABELS[post.category])}</span>
                {isAiSample(post.title) && <em className="discussion-ai-badge">{t("discussion.aiSample")}</em>}
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
              <article className="discussion-detail__post">
                <header>
                  <div>
                    <span>{t(CATEGORY_LABELS[selectedPost.category])}</span>
                    {isAiSample(selectedPost.title, selectedPost.content) && (
                      <em className="discussion-ai-badge">{t("discussion.aiSample")}</em>
                    )}
                    <h2>{selectedPost.title}</h2>
                  </div>
                  {renderAuthor(selectedPost.authorProfile)}
                </header>
                <p>{selectedPost.content}</p>
                <div className="discussion-tags">
                  {selectedPost.tags.map((item) => (
                    <button key={item} type="button" onClick={() => setTag(item)}>
                      #{item}
                    </button>
                  ))}
                </div>
                <footer>
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
                <div className="discussion-comment-list">
                  {selectedPost.comments.length === 0 ? (
                    <p className="discussion-empty">{t("discussion.firstComment")}</p>
                  ) : (
                    selectedPost.comments.map((comment) => renderComment(comment))
                  )}
                </div>
              </section>
            </>
          ) : (
            <p className="discussion-empty">{t("discussion.selectPost")}</p>
          )}
        </section>

        {currentUser && notifications.length > 0 && (
          <aside className="discussion-notifications" aria-label={t("discussion.aria.notifications")}>
            <div className="discussion-section-title">
              <strong>{t("discussion.notifications")}</strong>
              <button type="button" onClick={() => void handleReadNotifications()}>
                {t("discussion.markAllRead")}
              </button>
            </div>
            {notifications.slice(0, 5).map((item) => (
              <button
                className={item.read ? "discussion-notification" : "discussion-notification is-unread"}
                key={item.id}
                type="button"
                onClick={() => void refreshSelected(item.postId)}
              >
                <span>{item.actor.nickname}</span>
                <strong>{item.message}</strong>
                <small>{formatDateTime(item.createdAt, locale, t("discussion.justNow"))}</small>
              </button>
            ))}
          </aside>
        )}
      </section>
    </section>
  );
}

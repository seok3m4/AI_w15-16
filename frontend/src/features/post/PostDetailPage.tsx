import { Icon } from '@iconify/react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LikeButton } from '../friend/LikeButton';
import { me } from '../../lib/api/auth';
import { getJob, getMemoryStatus, memoryQueryKeys, reindexMemories } from '../../lib/api/memory';
import {
  commentQueryKeys,
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from '../../lib/api/comments';
import { deletePost, getPost, postQueryKeys } from '../../lib/api/posts';
import {
  AsyncJobResponse,
  CommentListResponse,
  CommentResponse,
  PostDetailResponse,
  PostMemoryStatus,
} from '../../lib/api/types';
import {
  formatDate,
  getErrorMessage,
  isNotFound,
  memoryStatusLabel,
  memoryStatusTone,
} from './utils';

const COMMENT_PAGE_SIZE = 20;

export function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [activeReindexJobId, setActiveReindexJobId] = useState<string | null>(null);

  const commentsQueryKey = commentQueryKeys.list(postId ?? '', COMMENT_PAGE_SIZE);
  const userQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: me,
  });
  const detailQuery = useQuery({
    enabled: Boolean(postId),
    queryKey: postQueryKeys.detail(postId ?? ''),
    queryFn: () => getPost(requiredPostId(postId)),
  });
  const commentsQuery = useInfiniteQuery({
    enabled: Boolean(postId),
    queryKey: commentsQueryKey,
    queryFn: ({ pageParam }) =>
      listComments(requiredPostId(postId), Number(pageParam), COMMENT_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page.page + 1;
      return nextPage < lastPage.page.totalPages ? nextPage : undefined;
    },
  });
  const memoryStatusQuery = useQuery({
    enabled: Boolean(postId) && detailQuery.data?.accessScope === 'me',
    queryKey: memoryQueryKeys.status(postId ?? ''),
    queryFn: () => getMemoryStatus(requiredPostId(postId)),
  });
  const jobQuery = useQuery({
    enabled: Boolean(activeReindexJobId),
    queryKey: activeReindexJobId
      ? memoryQueryKeys.job(activeReindexJobId)
      : ['memory', 'jobs', 'none'],
    queryFn: () => getJob(activeReindexJobId ?? ''),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isAsyncJobInProgress(status) ? 2000 : false;
    },
  });

  const reindexMutation = useMutation({
    mutationFn: () =>
      reindexMemories({
        postIds: [requiredPostId(postId)],
        reason: 'manual-reindex',
      }),
    onSuccess: (job: AsyncJobResponse) => {
      if (!postId) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: memoryQueryKeys.status(postId) });
      setActiveReindexJobId(job.id);
      if (isAsyncJobTerminal(job.status)) {
        setActiveReindexJobId(null);
      }
    },
  });
  const createCommentMutation = useMutation({
    mutationFn: (content: string) => createComment(requiredPostId(postId), { content }),
    onSuccess: async () => {
      setCommentContent('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(requiredPostId(postId)) }),
        queryClient.invalidateQueries({ queryKey: postQueryKeys.all }),
      ]);
    },
  });
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      updateComment(commentId, { content }),
    onSuccess: async (updatedComment) => {
      setEditingCommentId(null);
      setEditingCommentContent('');
      queryClient.setQueryData<InfiniteData<CommentListResponse, number>>(commentsQueryKey, (current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            items: page.items.map((comment) =>
              comment.id === updatedComment.id ? updatedComment : comment,
            ),
          })),
        };
      });
      await queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
  });
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: async (_result, commentId) => {
      queryClient.setQueryData<InfiniteData<CommentListResponse, number>>(commentsQueryKey, (current) => {
        if (!current) {
          return current;
        }
        const removed = current.pages.some((page) =>
          page.items.some((comment) => comment.id === commentId),
        );
        const currentTotalCount = current.pages[0]?.page.totalCount ?? 0;
        const totalCount = removed ? Math.max(0, currentTotalCount - 1) : currentTotalCount;
        const totalPages =
          totalCount === 0 ? 0 : Math.ceil(totalCount / COMMENT_PAGE_SIZE);
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            items: page.items.filter((comment) => comment.id !== commentId),
            page: {
              ...page.page,
              totalCount,
              totalPages,
            },
          })),
        };
      });
      queryClient.setQueryData<PostDetailResponse>(
        postQueryKeys.detail(requiredPostId(postId)),
        (current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            commentCount: Math.max(0, current.commentCount - 1),
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(requiredPostId(postId)) }),
        queryClient.invalidateQueries({ queryKey: postQueryKeys.all }),
      ]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deletePost(requiredPostId(postId)),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: postQueryKeys.detail(requiredPostId(postId)) });
      await queryClient.invalidateQueries({ queryKey: postQueryKeys.all });
      navigate('/app');
    },
  });

  const commentPages = commentsQuery.data?.pages ?? [];
  const comments = commentPages.flatMap((page) => page.items);
  const totalComments = commentPages[0]?.page.totalCount ?? comments.length;
  const memoryStatus: PostMemoryStatus | null = memoryStatusQuery.data ?? null;
  const activeJob: AsyncJobResponse | null = jobQuery.data ?? null;

  useEffect(() => {
    if (!postId || !activeReindexJobId || !activeJob || !isAsyncJobTerminal(activeJob.status)) {
      return;
    }
    queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) });
    queryClient.invalidateQueries({ queryKey: memoryQueryKeys.status(postId) });
    setActiveReindexJobId(null);
  }, [activeReindexJobId, activeJob?.status, postId, queryClient]);

  if (!postId) {
    return <PostNotFound />;
  }

  if (detailQuery.isLoading) {
    return <PostDetailSkeleton />;
  }

  if (detailQuery.isError) {
    if (isNotFound(detailQuery.error)) {
      return <PostNotFound />;
    }

    return (
      <section className="post-page">
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(detailQuery.error, '게시글을 불러오지 못했습니다.')}</p>
          <Link className="button button-secondary" to="/app">
            홈으로
          </Link>
        </div>
      </section>
    );
  }

  const post = detailQuery.data;
  if (!post) {
    return <PostNotFound />;
  }

  const statusTone = memoryStatusTone(post.memoryStatus);
  const canManagePost = post.accessScope === 'me';
  const canOpenReindex = post.accessScope === 'me';
  const isReindexing = Boolean(activeReindexJobId) || isAsyncJobInProgress(activeJob?.status);
  const chunkStatus = memoryStatus?.chunkStatus ?? post.memoryStatus ?? 'pending';
  const embeddingStatus = memoryStatus?.embeddingStatus ?? post.memoryStatus ?? 'pending';
  const memoryLastIndexedAt = memoryStatus?.lastIndexedAt
    ? formatDate(memoryStatus.lastIndexedAt)
    : 'Not indexed yet';
  const memoryFailureReason = memoryStatus?.failureReason;
  const memoryIsFailed = memoryStatus?.chunkStatus === 'failed' || memoryStatus?.embeddingStatus === 'failed';

  const handleCreateComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = commentContent.trim();
    if (!content || createCommentMutation.isPending) {
      return;
    }
    createCommentMutation.mutate(content);
  };
  const handleStartEditComment = (comment: CommentResponse) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };
  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };
  const handleUpdateComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = editingCommentContent.trim();
    if (!editingCommentId || !content || updateCommentMutation.isPending) {
      return;
    }
    updateCommentMutation.mutate({ commentId: editingCommentId, content });
  };

  return (
    <article className="post-detail" aria-labelledby="post-detail-title">
      <div className="detail-actions">
        <Link className="button button-secondary" to="/app">
          <Icon icon="solar:alt-arrow-left-linear" aria-hidden="true" />
          돌아가기
        </Link>
        {canManagePost ? (
          <div className="detail-action-group">
            <Link className="button button-secondary" to={`/app/posts/${post.id}/edit`}>
              <Icon icon="solar:pen-new-square-linear" aria-hidden="true" />
              수정
            </Link>
            <button
              className="button button-danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              type="button"
            >
              <Icon icon="solar:trash-bin-trash-linear" aria-hidden="true" />
              삭제
            </button>
          </div>
        ) : null}
      </div>

      {deleteMutation.isError ? (
        <p className="alert alert-error" role="alert">
          {getErrorMessage(deleteMutation.error, '게시글을 삭제하지 못했습니다.')}
        </p>
      ) : null}

      <div className="post-detail-meta">
        <span>{post.author.nickname}</span>
        <span>{formatDate(post.createdAt)}</span>
        <span className={`memory-badge ${statusTone}`}>
          <Icon icon="solar:database-linear" aria-hidden="true" />
          {memoryStatusLabel(post.memoryStatus)}
        </span>
      </div>

      <section className="memory-status-panel">
        <div className="memory-status-grid">
          <p className="memory-status-meta">Chunk status: {memoryStatusLabel(chunkStatus)}</p>
          <p className="memory-status-meta">
            Embedding status: {memoryStatusLabel(embeddingStatus)}
          </p>
          <p className="memory-status-meta">Last indexed: {memoryLastIndexedAt}</p>
        </div>
        {memoryFailureReason ? <p className="memory-error">{memoryFailureReason}</p> : null}
        {memoryIsFailed && canOpenReindex ? (
          <p className="memory-status-meta">
            Reindexing may fix failed chunks and embeddings.
          </p>
        ) : null}
        {reindexMutation.isError ? (
          <p className="memory-error">
            {getErrorMessage(reindexMutation.error, 'Failed to request memory reindex.')}
          </p>
        ) : null}
        {activeJob || isReindexing ? (
          <p className="memory-job-status">
            Memory job: {formatAsyncJobStatus(activeJob?.status)} {activeJob ? `(${activeJob.progress}%)` : ''}
          </p>
        ) : null}
        {canOpenReindex ? (
          <button
            className="button button-secondary"
            disabled={isReindexing || reindexMutation.isPending}
            onClick={() => reindexMutation.mutate()}
            type="button"
          >
            {isReindexing || reindexMutation.isPending ? 'Reindexing...' : 'Reindex memory'}
          </button>
        ) : null}
      </section>

      <h2 id="post-detail-title">{post.title}</h2>
      <div className="tag-row">
        {post.tags.map((tag) => (
          <span className="tag-chip" key={tag}>
            #{tag}
          </span>
        ))}
      </div>
      <p className="post-body">{post.content}</p>

      <footer className="post-detail-footer">
        <span>
          <Icon icon="solar:chat-round-dots-linear" aria-hidden="true" />
          댓글 {post.commentCount}
        </span>
        <span>
          <Icon icon="solar:heart-linear" aria-hidden="true" />
          좋아요 {post.likeCount}
        </span>
        <LikeButton post={post} />
      </footer>

      <CommentSection
        commentContent={commentContent}
        comments={comments}
        createError={createCommentMutation.error}
        deleteError={deleteCommentMutation.error}
        editingCommentContent={editingCommentContent}
        editingCommentId={editingCommentId}
        hasNextPage={commentsQuery.hasNextPage}
        isCreating={createCommentMutation.isPending}
        isDeleting={deleteCommentMutation.isPending}
        isFetchingNextPage={commentsQuery.isFetchingNextPage}
        isUpdating={updateCommentMutation.isPending}
        error={commentsQuery.error}
        isError={commentsQuery.isError}
        isLoading={commentsQuery.isLoading}
        onCancelEditComment={handleCancelEditComment}
        onCommentContentChange={setCommentContent}
        onCreateComment={handleCreateComment}
        onDeleteComment={(commentId) => deleteCommentMutation.mutate(commentId)}
        onEditingCommentContentChange={setEditingCommentContent}
        onLoadMoreComments={() => commentsQuery.fetchNextPage()}
        onStartEditComment={handleStartEditComment}
        onUpdateComment={handleUpdateComment}
        totalComments={totalComments}
        updateError={updateCommentMutation.error}
        userId={userQuery.data?.id}
      />
    </article>
  );
}

type CommentSectionProps = {
  commentContent: string;
  comments: CommentResponse[];
  createError: unknown;
  deleteError: unknown;
  editingCommentContent: string;
  editingCommentId: string | null;
  hasNextPage: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  isFetchingNextPage: boolean;
  isUpdating: boolean;
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  onCancelEditComment: () => void;
  onCommentContentChange: (content: string) => void;
  onCreateComment: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteComment: (commentId: string) => void;
  onEditingCommentContentChange: (content: string) => void;
  onLoadMoreComments: () => void;
  onStartEditComment: (comment: CommentResponse) => void;
  onUpdateComment: (event: FormEvent<HTMLFormElement>) => void;
  totalComments: number;
  updateError: unknown;
  userId?: string;
};

function CommentSection({
  commentContent,
  comments,
  createError,
  deleteError,
  editingCommentContent,
  editingCommentId,
  error,
  hasNextPage,
  isCreating,
  isDeleting,
  isFetchingNextPage,
  isUpdating,
  isError,
  isLoading,
  onCancelEditComment,
  onCommentContentChange,
  onCreateComment,
  onDeleteComment,
  onEditingCommentContentChange,
  onLoadMoreComments,
  onStartEditComment,
  onUpdateComment,
  totalComments,
  updateError,
  userId,
}: CommentSectionProps) {
  return (
    <section className="comment-section" aria-labelledby="comment-section-title">
      <div className="comment-section-header">
        <h3 id="comment-section-title">댓글</h3>
        <span>{totalComments}개</span>
      </div>

      {isLoading ? (
        <p className="comment-state" aria-live="polite">
          댓글을 불러오는 중입니다.
        </p>
      ) : null}

      {isError ? (
        <p className="alert alert-error" role="alert">
          {getErrorMessage(error, '댓글을 불러오지 못했습니다.')}
        </p>
      ) : null}

      {!isLoading && !isError && comments.length === 0 ? (
        <p className="comment-state">첫 댓글을 남겨보세요</p>
      ) : null}

      {comments.length > 0 ? (
        <ul className="comment-list" aria-label="댓글 목록">
          {comments.map((comment) => (
            <li className="comment-item" key={comment.id}>
              <div className="comment-item-meta">
                <span>{comment.author.nickname}</span>
                <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
              </div>
              {editingCommentId === comment.id ? (
                <form className="comment-edit-form" onSubmit={onUpdateComment}>
                  <label className="sr-only" htmlFor={`comment-edit-${comment.id}`}>
                    댓글 수정 입력
                  </label>
                  <textarea
                    aria-label="댓글 수정 입력"
                    id={`comment-edit-${comment.id}`}
                    onChange={(event) => onEditingCommentContentChange(event.target.value)}
                    rows={3}
                    value={editingCommentContent}
                  />
                  <div className="comment-actions">
                    <button
                      className="button button-primary"
                      disabled={isUpdating || editingCommentContent.trim().length === 0}
                      type="submit"
                    >
                      {isUpdating ? '저장 중' : '수정 저장'}
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={isUpdating}
                      onClick={onCancelEditComment}
                      type="button"
                    >
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p>{comment.content}</p>
                  {comment.author.id === userId ? (
                    <div className="comment-actions">
                      <button
                        aria-label="댓글 수정"
                        className="icon-button"
                        disabled={isDeleting}
                        onClick={() => onStartEditComment(comment)}
                        type="button"
                      >
                        <Icon icon="solar:pen-new-square-linear" aria-hidden="true" />
                      </button>
                      <button
                        aria-label="댓글 삭제"
                        className="icon-button danger"
                        disabled={isDeleting}
                        onClick={() => onDeleteComment(comment.id)}
                        type="button"
                      >
                        <Icon icon="solar:trash-bin-trash-linear" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {hasNextPage ? (
        <button
          className="button button-secondary comment-load-more"
          disabled={isFetchingNextPage}
          onClick={onLoadMoreComments}
          type="button"
        >
          {isFetchingNextPage ? '불러오는 중' : '댓글 더 불러오기'}
        </button>
      ) : null}

      {updateError ? (
        <p className="alert alert-error" role="alert">
          {getErrorMessage(updateError, '댓글을 수정하지 못했습니다.')}
        </p>
      ) : null}

      {deleteError ? (
        <p className="alert alert-error" role="alert">
          {getErrorMessage(deleteError, '댓글을 삭제하지 못했습니다.')}
        </p>
      ) : null}

      {createError ? (
        <p className="alert alert-error" role="alert">
          {getErrorMessage(createError, '댓글을 작성하지 못했습니다.')}
        </p>
      ) : null}

      <form className="comment-form" onSubmit={onCreateComment}>
        <label className="sr-only" htmlFor="comment-content">
          댓글 입력
        </label>
        <textarea
          aria-label="댓글 입력"
          id="comment-content"
          onChange={(event) => onCommentContentChange(event.target.value)}
          placeholder="댓글을 남겨보세요"
          rows={3}
          value={commentContent}
        />
        <button
          className="button button-primary"
          disabled={isCreating || commentContent.trim().length === 0}
          type="submit"
        >
          {isCreating ? '작성 중' : '작성'}
          <span className="button-icon">
            <Icon icon="solar:arrow-up-linear" aria-hidden="true" />
          </span>
        </button>
      </form>
    </section>
  );
}

function requiredPostId(postId: string | undefined): string {
  if (!postId) {
    throw new Error('postId is required.');
  }
  return postId;
}

function requiredPostStatus(status?: string): string {
  return status ?? 'unknown';
}

function isAsyncJobInProgress(status?: string): boolean {
  return status === 'pending' || status === 'running';
}

function isAsyncJobTerminal(status?: string): boolean {
  return !isAsyncJobInProgress(status);
}

function formatAsyncJobStatus(status?: string): string {
  switch (requiredPostStatus(status)) {
    case 'pending':
      return 'Pending';
    case 'running':
      return 'Running';
    case 'succeeded':
      return 'Succeeded';
    case 'failed':
      return 'Failed';
    case 'approval_required':
      return 'Approval required';
    case 'rejected':
      return 'Rejected';
    default:
      return requiredPostStatus(status);
  }
}

function PostNotFound() {
  return (
    <section className="post-page">
      <div className="state-panel">
        <Icon icon="solar:document-medicine-linear" aria-hidden="true" />
        <p>찾을 수 없는 게시물입니다</p>
        <Link className="button button-secondary" to="/app">
          홈으로
        </Link>
      </div>
    </section>
  );
}

function PostDetailSkeleton() {
  return (
    <section className="post-detail skeleton-detail" aria-label="게시글 상세 로딩 중">
      <span />
      <strong />
      <p />
      <p />
      <p />
    </section>
  );
}

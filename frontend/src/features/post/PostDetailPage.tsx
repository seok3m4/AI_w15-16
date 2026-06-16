import { Icon } from '@iconify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deletePost, getPost, postQueryKeys } from '../../lib/api/posts';
import {
  formatDate,
  getErrorMessage,
  isNotFound,
  memoryStatusLabel,
  memoryStatusTone,
} from './utils';

export function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    enabled: Boolean(postId),
    queryKey: postQueryKeys.detail(postId ?? ''),
    queryFn: () => getPost(requiredPostId(postId)),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deletePost(requiredPostId(postId)),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: postQueryKeys.detail(requiredPostId(postId)) });
      await queryClient.invalidateQueries({ queryKey: postQueryKeys.all });
      navigate('/app');
    },
  });

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

  return (
    <article className="post-detail" aria-labelledby="post-detail-title">
      <div className="detail-actions">
        <Link className="button button-secondary" to="/app">
          <Icon icon="solar:alt-arrow-left-linear" aria-hidden="true" />
          돌아가기
        </Link>
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
      </footer>
    </article>
  );
}

function requiredPostId(postId: string | undefined): string {
  if (!postId) {
    throw new Error('postId is required.');
  }
  return postId;
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

import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listPosts, postQueryKeys } from '../../lib/api/posts';
import { PostCard } from './PostCard';
import { getErrorMessage, POST_PAGE_SIZE } from './utils';

export function PostFeedPage() {
  const postsQuery = useQuery({
    queryKey: postQueryKeys.list(0, POST_PAGE_SIZE),
    queryFn: () => listPosts(0, POST_PAGE_SIZE),
  });

  return (
    <section className="post-page" aria-labelledby="post-feed-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Memory Posts</p>
          <h2 id="post-feed-title">내 기록 피드</h2>
        </div>
        <Link className="button button-primary" to="/app/posts/new">
          기록 작성
          <span className="button-icon">
            <Icon icon="solar:pen-new-square-linear" aria-hidden="true" />
          </span>
        </Link>
      </div>

      {postsQuery.isLoading ? <PostListSkeleton /> : null}

      {postsQuery.isError ? (
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(postsQuery.error, '게시글 목록을 불러오지 못했습니다.')}</p>
          <button className="button button-secondary" onClick={() => postsQuery.refetch()} type="button">
            다시 시도
          </button>
        </div>
      ) : null}

      {postsQuery.data?.items.length === 0 ? (
        <div className="empty-state">
          <Icon icon="solar:notebook-minimalistic-linear" aria-hidden="true" />
          <p className="empty-title">아직 기록이 없어요</p>
          <p className="empty-copy">첫 번째 텍스트 기억을 남겨보세요.</p>
          <Link className="button button-primary" to="/app/posts/new">
            첫 기록 작성
            <span className="button-icon">
              <Icon icon="solar:pen-new-square-linear" aria-hidden="true" />
            </span>
          </Link>
        </div>
      ) : null}

      {postsQuery.data && postsQuery.data.items.length > 0 ? (
        <div className="post-grid" aria-label="내 게시글 목록">
          {postsQuery.data.items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PostListSkeleton() {
  return (
    <div className="post-grid" aria-label="게시글 로딩 중">
      {[0, 1, 2].map((item) => (
        <div className="post-card skeleton-card" key={item}>
          <span />
          <strong />
          <p />
          <p />
        </div>
      ))}
    </div>
  );
}

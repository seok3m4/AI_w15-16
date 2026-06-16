import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listPosts, postQueryKeys } from '../../lib/api/posts';
import { PostCard } from '../post/PostCard';
import { PostListSkeleton } from '../post/PostFeedPage';
import { getErrorMessage, POST_PAGE_SIZE } from '../post/utils';

export function FriendFeedPage() {
  const params = { page: 0, scope: 'friends' as const, size: POST_PAGE_SIZE };
  const postsQuery = useQuery({
    queryKey: postQueryKeys.list(params),
    queryFn: () => listPosts(params),
  });

  return (
    <section className="post-page" aria-labelledby="friend-feed-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Friend Feed</p>
          <h2 id="friend-feed-title">친구 기록</h2>
        </div>
        <Link className="button button-secondary" to="/app/friends">
          친구 목록
        </Link>
      </div>

      {postsQuery.isLoading ? <PostListSkeleton /> : null}

      {postsQuery.isError ? (
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(postsQuery.error, '친구 기록을 불러오지 못했습니다.')}</p>
          <button
            className="button button-secondary"
            onClick={() => postsQuery.refetch()}
            type="button"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {postsQuery.data?.items.length === 0 ? (
        <div className="empty-state">
          <Icon icon="solar:users-group-rounded-linear" aria-hidden="true" />
          <p className="empty-title">아직 볼 수 있는 친구 기록이 없어요</p>
          <p className="empty-copy">친구 관계가 승인되면 이곳에서 기록을 볼 수 있습니다.</p>
          <Link className="button button-secondary" to="/app/friends">
            친구 관리
          </Link>
        </div>
      ) : null}

      {postsQuery.data && postsQuery.data.items.length > 0 ? (
        <div className="post-grid" aria-label="친구 게시글 목록">
          {postsQuery.data.items.map((post) => (
            <PostCard key={post.id} post={post} showLikeAction />
          ))}
        </div>
      ) : null}
    </section>
  );
}

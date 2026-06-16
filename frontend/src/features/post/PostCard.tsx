import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { LikeButton } from '../friend/LikeButton';
import { PostSummaryResponse } from '../../lib/api/types';
import { formatDate, memoryStatusLabel, memoryStatusTone } from './utils';

type PostCardProps = {
  post: PostSummaryResponse;
  showLikeAction?: boolean;
};

export function PostCard({ post, showLikeAction = false }: PostCardProps) {
  const statusTone = memoryStatusTone(post.memoryStatus);

  return (
    <div className="post-card lift">
      <article>
        <Link
          aria-label={`${post.title} 상세 보기`}
          className="post-card-link"
          to={`/app/posts/${post.id}`}
        >
          <div className="post-card-meta">
            <span>{formatDate(post.createdAt)}</span>
            <span className={`memory-badge ${statusTone}`}>
              <Icon icon="solar:database-linear" aria-hidden="true" />
              {memoryStatusLabel(post.memoryStatus)}
            </span>
          </div>
          <h2>{post.title}</h2>
          <p>{post.contentPreview}</p>
          <div className="tag-row" aria-label="태그">
            {post.tags.map((tag) => (
              <span className="tag-chip" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        </Link>
        <div className="post-card-footer">
          <span>
            <Icon icon="solar:chat-round-dots-linear" aria-hidden="true" />
            {post.commentCount}
          </span>
          {showLikeAction ? (
            <LikeButton post={post} />
          ) : (
            <span>
              <Icon icon="solar:heart-linear" aria-hidden="true" />
              {post.likeCount}
            </span>
          )}
          <span className="author-name">{post.author.nickname}</span>
        </div>
      </article>
    </div>
  );
}

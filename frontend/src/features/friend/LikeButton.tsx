import { Icon } from '@iconify/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { likePost, unlikePost } from '../../lib/api/likes';
import { postQueryKeys } from '../../lib/api/posts';
import { PostDetailResponse, PostSummaryResponse } from '../../lib/api/types';

type LikeButtonProps = {
  post: Pick<PostSummaryResponse, 'id' | 'likedByMe' | 'likeCount'>;
};

export function LikeButton({ post }: LikeButtonProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => (post.likedByMe ? unlikePost(post.id) : likePost(post.id)),
    onSuccess: async (state) => {
      queryClient.setQueriesData<PostSummaryResponse>(
        { queryKey: postQueryKeys.all },
        (current) =>
          current?.id === state.postId
            ? { ...current, likedByMe: state.likedByMe, likeCount: state.likeCount }
            : current,
      );
      queryClient.setQueryData<PostDetailResponse>(postQueryKeys.detail(post.id), (current) =>
        current
          ? { ...current, likedByMe: state.likedByMe, likeCount: state.likeCount }
          : current,
      );
      await queryClient.invalidateQueries({ queryKey: postQueryKeys.all });
    },
  });

  return (
    <button
      aria-label={post.likedByMe ? '좋아요 취소' : '좋아요'}
      className={`like-button${post.likedByMe ? ' active' : ''}`}
      disabled={mutation.isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate();
      }}
      type="button"
    >
      <Icon icon={post.likedByMe ? 'solar:heart-bold' : 'solar:heart-linear'} aria-hidden="true" />
      <span>{post.likeCount}</span>
    </button>
  );
}

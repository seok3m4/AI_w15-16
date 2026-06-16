import { apiRequest } from './client';
import { PostLikeResponse } from './types';

export function likePost(postId: string): Promise<PostLikeResponse> {
  return apiRequest<PostLikeResponse>(`/posts/${postId}/likes`, {
    method: 'POST',
  });
}

export function unlikePost(postId: string): Promise<PostLikeResponse> {
  return apiRequest<PostLikeResponse>(`/posts/${postId}/likes`, {
    method: 'DELETE',
  });
}

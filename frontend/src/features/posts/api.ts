import { request } from '../../api/http';
import type { PageResponse, Post, PostCreatePayload, PostUpdatePayload } from './types';

export function fetchPosts(keyword = '') {
  const params = new URLSearchParams();

  if (keyword.trim()) {
    params.set('keyword', keyword.trim());
  }

  const query = params.toString();
  return request<PageResponse<Post>>(`/posts${query ? `?${query}` : ''}`);
}

export function createPost(payload: PostCreatePayload) {
  return request<Post>('/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePost(postId: number, payload: PostUpdatePayload) {
  return request<Post>(`/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deletePost(postId: number) {
  return request<void>(`/posts/${postId}`, {
    method: 'DELETE',
  });
}


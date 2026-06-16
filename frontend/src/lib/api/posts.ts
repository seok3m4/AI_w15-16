import { apiRequest } from './client';
import {
  CreatePostRequest,
  PostDetailResponse,
  PostListResponse,
  PostResponse,
} from './types';

export const postQueryKeys = {
  all: ['posts'] as const,
  list: (page: number, size: number) => ['posts', 'list', page, size] as const,
  detail: (postId: string) => ['posts', 'detail', postId] as const,
};

export function listPosts(page = 0, size = 20): Promise<PostListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    scope: 'me',
    size: String(size),
    sort: 'createdAt,desc',
  });

  return apiRequest<PostListResponse>(`/posts?${query.toString()}`);
}

export function getPost(postId: string): Promise<PostDetailResponse> {
  return apiRequest<PostDetailResponse>(`/posts/${postId}`);
}

export function createPost(request: CreatePostRequest): Promise<PostResponse> {
  return apiRequest<PostResponse>('/posts', {
    body: request,
    method: 'POST',
  });
}

export function updatePost(postId: string, request: CreatePostRequest): Promise<PostResponse> {
  return apiRequest<PostResponse>(`/posts/${postId}`, {
    body: request,
    method: 'PUT',
  });
}

export function deletePost(postId: string): Promise<void> {
  return apiRequest<void>(`/posts/${postId}`, {
    method: 'DELETE',
  });
}

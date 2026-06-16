import { apiRequest } from './client';
import {
  CreatePostRequest,
  PostDetailResponse,
  PostListResponse,
  PostResponse,
} from './types';

export type PostListParams = {
  page?: number;
  q?: string | null;
  size?: number;
  scope?: 'me' | 'friends' | 'all_accessible';
  tag?: string | null;
};

export const postQueryKeys = {
  all: ['posts'] as const,
  list: (params: PostListParams = {}) =>
    [
      'posts',
      'list',
      {
        page: params.page ?? 0,
        q: cleanQueryValue(params.q),
        size: params.size ?? 20,
        scope: params.scope ?? 'me',
        tag: cleanQueryValue(params.tag),
      },
    ] as const,
  detail: (postId: string) => ['posts', 'detail', postId] as const,
};

export function listPosts(params: PostListParams = {}): Promise<PostListResponse> {
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const query = new URLSearchParams({
    page: String(page),
    scope: params.scope ?? 'me',
    size: String(size),
    sort: 'createdAt,desc',
  });
  const keyword = cleanQueryValue(params.q);
  const tag = cleanQueryValue(params.tag);

  if (keyword) {
    query.set('q', keyword);
  }
  if (tag) {
    query.set('tag', tag);
  }

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

function cleanQueryValue(value: string | null | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

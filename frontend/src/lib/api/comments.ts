import { apiRequest } from './client';
import { CommentListResponse, CommentResponse, CreateCommentRequest } from './types';

export const commentQueryKeys = {
  all: ['comments'] as const,
  list: (postId: string, size: number) => ['comments', 'list', postId, size] as const,
};

export function listComments(postId: string, page = 0, size = 20): Promise<CommentListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: 'createdAt,asc',
  });

  return apiRequest<CommentListResponse>(`/posts/${postId}/comments?${query.toString()}`);
}

export function createComment(
  postId: string,
  request: CreateCommentRequest,
): Promise<CommentResponse> {
  return apiRequest<CommentResponse>(`/posts/${postId}/comments`, {
    body: request,
    method: 'POST',
  });
}

export function updateComment(
  commentId: string,
  request: CreateCommentRequest,
): Promise<CommentResponse> {
  return apiRequest<CommentResponse>(`/comments/${commentId}`, {
    body: request,
    method: 'PUT',
  });
}

export function deleteComment(commentId: string): Promise<void> {
  return apiRequest<void>(`/comments/${commentId}`, {
    method: 'DELETE',
  });
}

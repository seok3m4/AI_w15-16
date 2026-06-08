export type PostStatus = 'PUBLISHED' | 'DELETED';

export interface Post {
  id: number;
  title: string;
  content: string;
  authorName: string;
  viewCount: number;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PostCreatePayload {
  title: string;
  content: string;
  authorName: string;
}

export interface PostUpdatePayload {
  title: string;
  content: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}


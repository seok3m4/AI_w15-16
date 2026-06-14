import { xsrfToken } from "../../../api/backend";

export type BoardCategory =
  | "inflation"
  | "jobs"
  | "rates"
  | "fx"
  | "markets"
  | "commodities"
  | "korea"
  | "question"
  | "general";

export interface BoardAuthorProfile {
  userId: number | null;
  nickname: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface BoardComment {
  id: number;
  parentCommentId: number | null;
  content: string;
  author: string;
  authorProfile: BoardAuthorProfile;
  replies: BoardComment[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardPostSummary {
  id: number;
  category: BoardCategory;
  title: string;
  excerpt: string;
  author: string;
  authorProfile: BoardAuthorProfile;
  tags: string[];
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardPostDetail {
  id: number;
  category: BoardCategory;
  title: string;
  content: string;
  author: string;
  authorProfile: BoardAuthorProfile;
  tags: string[];
  comments: BoardComment[];
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardFeedResponse {
  items: BoardPostSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BoardTag {
  id: number;
  name: string;
}

export interface BoardPostRequest {
  category: BoardCategory;
  title: string;
  content: string;
  tags: string[];
}

export interface BoardLikeResponse {
  postId: number;
  likeCount: number;
  likedByMe: boolean;
}

export interface BoardNotificationItem {
  id: number;
  postId: number;
  commentId: number | null;
  type: string;
  message: string;
  actor: BoardAuthorProfile;
  read: boolean;
  createdAt: string;
}

export interface BoardNotificationResponse {
  items: BoardNotificationItem[];
  unreadCount: number;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = xsrfToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function fetchPosts(filters: {
  query?: string;
  tag?: string | null;
  category?: BoardCategory | "all";
  sort?: "latest" | "popular";
  page?: number;
  size?: number;
}): Promise<BoardFeedResponse> {
  const params = new URLSearchParams();
  if (filters.query?.trim()) {
    params.set("query", filters.query.trim());
  }
  if (filters.tag) {
    params.set("tag", filters.tag);
  }
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.sort) {
    params.set("sort", filters.sort);
  }
  if (filters.page !== undefined) {
    params.set("page", String(filters.page));
  }
  if (filters.size !== undefined) {
    params.set("size", String(filters.size));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson<BoardFeedResponse>(`/api/posts${suffix}`);
}

export function fetchPost(id: number): Promise<BoardPostDetail> {
  return requestJson<BoardPostDetail>(`/api/posts/${id}`);
}

export function createPost(
  post: BoardPostRequest,
): Promise<BoardPostDetail> {
  return requestJson<BoardPostDetail>("/api/posts", {
    method: "POST",
    body: JSON.stringify(post),
  });
}

export function updatePost(
  id: number,
  post: BoardPostRequest,
): Promise<BoardPostDetail> {
  return requestJson<BoardPostDetail>(`/api/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(post),
  });
}

export function deletePost(id: number): Promise<void> {
  return requestJson<void>(`/api/posts/${id}`, {
    method: "DELETE",
  });
}

export function likePost(id: number): Promise<BoardLikeResponse> {
  return requestJson<BoardLikeResponse>(`/api/posts/${id}/like`, {
    method: "POST",
  });
}

export function unlikePost(id: number): Promise<BoardLikeResponse> {
  return requestJson<BoardLikeResponse>(`/api/posts/${id}/like`, {
    method: "DELETE",
  });
}

export function reportPost(
  id: number,
  reason: string,
  detail = "",
): Promise<void> {
  return requestJson<void>(`/api/posts/${id}/reports`, {
    method: "POST",
    body: JSON.stringify({ reason, detail }),
  });
}

export function createComment(
  postId: number,
  content: string,
  parentCommentId?: number,
): Promise<BoardComment> {
  return requestJson<BoardComment>(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content, parentCommentId }),
  });
}

export function updateComment(
  postId: number,
  commentId: number,
  content: string,
): Promise<BoardComment> {
  return requestJson<BoardComment>(
    `/api/posts/${postId}/comments/${commentId}`,
    {
      method: "PUT",
      body: JSON.stringify({ content }),
    },
  );
}

export function deleteComment(
  postId: number,
  commentId: number,
): Promise<void> {
  return requestJson<void>(`/api/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

export function reportComment(
  postId: number,
  commentId: number,
  reason: string,
  detail = "",
): Promise<void> {
  return requestJson<void>(`/api/posts/${postId}/comments/${commentId}/reports`, {
    method: "POST",
    body: JSON.stringify({ reason, detail }),
  });
}

export function fetchTags(): Promise<BoardTag[]> {
  return requestJson<BoardTag[]>("/api/tags");
}

export function fetchBoardNotifications(): Promise<BoardNotificationResponse> {
  return requestJson<BoardNotificationResponse>("/api/board/notifications");
}

export function markBoardNotificationsRead(): Promise<void> {
  return requestJson<void>("/api/board/notifications/read-all", {
    method: "POST",
  });
}

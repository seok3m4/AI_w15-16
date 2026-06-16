export type FieldError = {
  field: string;
  message: string;
};

export type ApiErrorBody = {
  status?: number;
  code?: string;
  title?: string;
  detail?: string;
  errors?: FieldError[];
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly title: string;
  readonly detail: string;
  readonly fieldErrors: FieldError[];

  constructor(status: number, body: ApiErrorBody = {}) {
    const detail = body.detail ?? body.title ?? '요청을 처리하지 못했습니다.';
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.title = body.title ?? 'Request failed';
    this.detail = detail;
    this.fieldErrors = body.errors ?? [];
  }
}

export type UserPrivateResponse = {
  id: string;
  email: string;
  nickname: string;
  friendAiSharingEnabled?: boolean;
  createdAt?: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserPrivateResponse;
};

export type RefreshResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type SignupRequest = {
  email: string;
  password: string;
  nickname: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type PageResponse = {
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
};

export type UserPublicSummary = {
  id: string;
  nickname: string;
};

export type MemoryStatus = 'pending' | 'running' | 'succeeded' | 'failed' | string;

export type PostSummaryResponse = {
  id: string;
  author: UserPublicSummary;
  title: string;
  contentPreview: string;
  tags: string[];
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  accessScope: 'me' | 'friend' | string;
  memoryStatus: MemoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type PostRecentCommentResponse = {
  id: string;
  author: UserPublicSummary;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentResponse = PostRecentCommentResponse & {
  postId: string;
};

export type PostDetailResponse = {
  id: string;
  author: UserPublicSummary;
  title: string;
  content: string;
  tags: string[];
  recentComments: PostRecentCommentResponse[];
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  accessScope: 'me' | 'friend' | string;
  memoryStatus: MemoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type PostResponse = Omit<PostDetailResponse, 'recentComments'>;

export type PostListResponse = {
  items: PostSummaryResponse[];
  page: PageResponse;
};

export type CreatePostRequest = {
  title: string;
  content: string;
  tagNames: string[];
};

export type CommentListResponse = {
  items: CommentResponse[];
  page: PageResponse;
};

export type CreateCommentRequest = {
  content: string;
};

export type TagResponse = {
  id: string;
  name: string;
  postCount: number;
};

export type TagListResponse = {
  items: TagResponse[];
  page: PageResponse;
};

export type FriendshipDirection = 'incoming' | 'outgoing' | string;
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | string;

export type FriendshipUserResponse = UserPublicSummary & {
  friendAiSharingEnabled?: boolean;
};

export type FriendshipListItemResponse = {
  id: string;
  user: FriendshipUserResponse;
  status: FriendshipStatus;
  direction: FriendshipDirection;
  createdAt: string;
  updatedAt: string;
};

export type FriendshipListResponse = {
  items: FriendshipListItemResponse[];
  page: PageResponse;
};

export type CreateFriendshipRequest = {
  addresseeUserId: string;
};

export type FriendshipResponse = {
  id: string;
  requester?: FriendshipUserResponse;
  addressee?: FriendshipUserResponse;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
};

export type FriendshipStatusResponse = {
  id: string;
  status: FriendshipStatus;
  updatedAt: string;
};

export type PostLikeResponse = {
  postId: string;
  likedByMe: boolean;
  likeCount: number;
};

export type AiSharingSettingResponse = {
  friendAiSharingEnabled: boolean;
  updatedAt: string;
};

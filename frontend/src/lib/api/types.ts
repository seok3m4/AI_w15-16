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

export type PostMemoryStatus = {
  postId: string;
  chunkStatus: string;
  embeddingStatus: string;
  lastIndexedAt: string | null;
  failureReason: string | null;
};

export type AsyncJobResponse = {
  id: string;
  type: string;
  status: string;
  progress: number;
  retryable: boolean;
  result: unknown;
  error: unknown;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type MemorySearchRequest = {
  query: string;
  scope?: string;
  limit?: number;
};

export type MemorySearchResultItem = {
  postId: string;
  chunkId: string;
  ownerUserId: string;
  ownerNickname: string;
  title: string;
  snippet: string;
  score: number;
  sourceType: string;
  createdAt: string;
};

export type MemorySearchResponse = {
  query: string;
  scope: string;
  results: MemorySearchResultItem[];
};

export type MemorySummaryRequest = {
  query: string;
  scope?: string;
  sourcePostIds: string[];
  maxSources?: number;
};

export type MemorySummarySourceResponse = {
  ownerUserId: string;
  ownerNickname: string;
  postId: string;
  title: string;
  sourceType: string;
  summary: string;
};

export type MemorySummaryResponse = {
  query: string;
  answer: string;
  usedFriendContext: boolean;
  sources: MemorySummarySourceResponse[];
};

export type ReindexMemoriesRequest = {
  postIds: string[];
  reason?: string | null;
};

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

export type GiftBudgetRequest = {
  min?: number | null;
  max?: number | null;
  currency?: string | null;
};

export type FriendGiftRecommendationRequest = {
  occasion?: string;
  budget?: GiftBudgetRequest | null;
  preferences?: string;
  maxSources?: number;
};

export type GiftRecommendationItemResponse = {
  title: string;
  reason: string;
  confidence: string;
};

export type GiftRecommendationSourceResponse = {
  ownerUserId: string;
  ownerNickname: string;
  postId: string;
  title: string;
  sourceType: string;
  summary: string;
};

export type FriendGiftRecommendationResponse = {
  friendId: string;
  occasion: string;
  answer: string;
  recommendations: GiftRecommendationItemResponse[];
  sources: GiftRecommendationSourceResponse[];
};

export type ContextCapsuleSummaryResponse = {
  id: string;
  title: string;
  purpose: string;
  containsFriendContext: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContextCapsuleSourceResponse = {
  postId: string;
  chunkId: string;
  ownerUserId: string;
  ownerNickname: string;
  title: string;
  snippet: string;
  sourceType: string;
  createdAt: string;
};

export type ContextCapsuleResponse = {
  id: string;
  title: string;
  purpose: string;
  query: string;
  summary: string;
  keyFacts: string[];
  tags: string[];
  containsFriendContext: boolean;
  sources: ContextCapsuleSourceResponse[];
  createdAt: string;
  updatedAt: string;
};

export type ContextCapsuleCompactContextResponse = {
  purpose: string;
  summary: string;
  keyFacts: string[];
  sourcePostIds: string[];
  tags: string[];
};

export type ContextCapsuleListResponse = {
  items: ContextCapsuleSummaryResponse[];
  page: PageResponse;
};

export type CreateContextCapsuleRequest = {
  title: string;
  purpose: string;
  query?: string | null;
  scope?: 'me' | 'friend';
  friendId?: string | null;
  sourcePostIds?: string[] | null;
};

export type UpdateContextCapsuleRequest = {
  title: string;
  purpose: string;
};

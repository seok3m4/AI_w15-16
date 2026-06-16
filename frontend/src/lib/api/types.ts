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

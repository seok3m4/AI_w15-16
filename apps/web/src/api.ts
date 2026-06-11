// 📌 React 앱에서 NestJS API를 호출할 때 사용하는 함수들을 모아둔 파일.
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export type AuthUser = {
  id: string
  email: string
  name: string
}

export type AuthResponse = {
  accessToken: string
  user: AuthUser
}

export type PostTag = {
  id: string
  name: string
}

export type PostComment = {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
  }
}

export type TravelPost = {
  id: string
  title: string
  content: string
  city: string
  country: string
  duration: number | null
  authorId: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
  }
  tags: PostTag[]
}

export type TravelPostDetail = TravelPost & {
  comments: PostComment[]
}

export type PaginatedPosts = {
  items: TravelPost[]
  total: number
  page: number
  limit: number
}

export type PostPayload = {
  title: string
  content: string
  city: string
  country: string
  duration?: number
}

// NestJS 에러 응답에서 사용자에게 보여줄 메시지를 꺼낸다.
function getErrorMessage(body: unknown, fallback: string) {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    (typeof body.message === 'string' || Array.isArray(body.message))
  ) {
    return Array.isArray(body.message) ? body.message.join('\n') : body.message
  }

  return fallback
}

// 공통 fetch 처리 함수. JSON 요청을 보내고 실패 응답은 Error로 바꾼다.
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { headers, ...restOptions } = options

  const response = await fetch(`${API_BASE}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  const body = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(getErrorMessage(body, `HTTP ${response.status}`))
  }

  return body as T
}

// 회원가입 API를 호출하고 JWT와 사용자 정보를 받는다.
export function signup(email: string, name: string, password: string) {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  })
}

// 로그인 API를 호출하고 JWT와 사용자 정보를 받는다.
export function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// 저장된 JWT로 현재 로그인한 사용자 정보를 조회한다.
export function getMe(token: string) {
  return request<AuthUser>('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// 여행 코스 게시글 목록을 페이지 단위로 조회한다.
export function getPosts(page = 1, limit = 10) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  return request<PaginatedPosts>(`/posts?${params.toString()}`)
}

// 특정 여행 코스 게시글의 상세 정보를 조회한다.
export function getPost(id: string) {
  return request<TravelPostDetail>(`/posts/${id}`)
}

// 로그인한 사용자의 JWT로 새 여행 코스 게시글을 작성한다.
export function createPost(token: string, payload: PostPayload) {
  return request<TravelPostDetail>('/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

// 로그인한 사용자의 JWT로 본인 여행 코스 게시글을 수정한다.
export function updatePost(token: string, id: string, payload: PostPayload) {
  return request<TravelPostDetail>(`/posts/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

// 로그인한 사용자의 JWT로 본인 여행 코스 게시글을 삭제한다.
export function deletePost(token: string, id: string) {
  return request<{ success: boolean }>(`/posts/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

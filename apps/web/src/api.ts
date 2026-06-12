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

// 코스를 구성하는 개별 경유지(장소). 지도에 순서대로 마커로 표시된다.
export type Place = {
  id: string
  name: string
  address: string | null
  lat: number
  lng: number
  order: number
}

export type TravelPost = {
  id: string
  title: string
  content: string
  city: string
  duration: number | null
  authorId: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
  }
  tags: PostTag[]
  places: Place[]
  // 이 게시글이 저장된 총 횟수
  saveCount: number
  // 현재 로그인한 사용자가 이 게시글을 저장했는지 여부 (비로그인 시 false)
  isSaved: boolean
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

// 게시글을 만들/고칠 때 보내는 경유지 입력값. (id 없이 좌표와 순서만 보낸다)
export type PlaceInput = {
  name: string
  address?: string
  lat: number
  lng: number
  order: number
}

export type PostPayload = {
  title: string
  content: string
  city: string
  duration?: number
  tags?: string[]
  places?: PlaceInput[]
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

// 로그인 토큰이 있으면 Authorization 헤더를 만들어 주고, 없으면 빈 객체를 반환한다.
function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// 여행 코스 게시글 목록을 페이지 단위로 조회한다. 검색어(q)와 태그 필터를 함께 받는다.
// 토큰을 주면 각 게시글의 저장 여부(isSaved)도 함께 받는다.
export function getPosts(
  page = 1,
  limit = 10,
  options: { q?: string; tag?: string } = {},
  token?: string | null,
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (options.q?.trim()) {
    params.set('q', options.q.trim())
  }
  if (options.tag?.trim()) {
    params.set('tag', options.tag.trim())
  }

  return request<PaginatedPosts>(`/posts?${params.toString()}`, {
    headers: authHeaders(token),
  })
}

// 특정 여행 코스 게시글의 상세 정보를 조회한다. 토큰을 주면 저장 여부도 함께 받는다.
export function getPost(id: string, token?: string | null) {
  return request<TravelPostDetail>(`/posts/${id}`, {
    headers: authHeaders(token),
  })
}

// 게시글을 저장("나중에 보기") 목록에 추가한다.
export function savePost(token: string, postId: string) {
  return request<{ saved: boolean; saveCount: number }>(
    `/posts/${postId}/save`,
    {
      method: 'POST',
      headers: authHeaders(token),
    },
  )
}

// 게시글을 저장 목록에서 제거한다.
export function unsavePost(token: string, postId: string) {
  return request<{ saved: boolean; saveCount: number }>(
    `/posts/${postId}/save`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  )
}

// 마이페이지에서 보여줄 내가 저장한 게시글 목록을 조회한다.
export function getSavedPosts(token: string) {
  return request<TravelPost[]>('/me/saved-posts', {
    headers: authHeaders(token),
  })
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

// 로그인한 사용자가 특정 게시글에 댓글을 작성한다.
export function createComment(token: string, postId: string, content: string) {
  return request<PostComment>(`/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  })
}

// 댓글 작성자 본인이 자신의 댓글을 삭제한다.
export function deleteComment(
  token: string,
  postId: string,
  commentId: string,
) {
  return request<{ success: boolean }>(
    `/posts/${postId}/comments/${commentId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
}


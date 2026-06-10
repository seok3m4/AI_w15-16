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

// NestJS 에러 응답에서 사용자에게 보여줄 메시지를 꺼낸다.
function getErrorMessage(body: unknown, fallback: string) {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message
  }

  return fallback
}

// 공통 fetch 처리 함수. JSON 요청을 보내고 실패 응답은 Error로 바꾼다.
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
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

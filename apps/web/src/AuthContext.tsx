// 📌 로그인 상태와 JWT 토큰을 React 앱 전체에서 공유하는 Context.
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getMe, login as requestLogin, type AuthUser } from './api'
import { AuthContext } from './auth-context'

const TOKEN_STORAGE_KEY = 'cine-review-token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  )
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) {
      return
    }

    let isMounted = true

    // 새로고침 후에도 저장된 JWT로 현재 사용자 정보를 복구한다.
    getMe(token)
      .then((currentUser) => {
        if (isMounted) setUser(currentUser)
      })
      .catch(() => {
        if (!isMounted) return
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [token])

  // 로그인 성공 시 JWT는 localStorage에 저장하고 사용자 정보는 state에 보관한다.
  const login = useCallback(async (email: string, password: string) => {
    const auth = await requestLogin(email, password)
    localStorage.setItem(TOKEN_STORAGE_KEY, auth.accessToken)
    setToken(auth.accessToken)
    setUser(auth.user)
  }, [])

  // 로그아웃 시 저장된 JWT와 사용자 상태를 모두 비운다.
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ token, user, isLoading, login, logout }),
    [token, user, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// 📌 AuthProvider와 useAuth가 공유하는 인증 Context 정의.
import { createContext } from 'react'
import type { AuthUser } from './api'

export type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

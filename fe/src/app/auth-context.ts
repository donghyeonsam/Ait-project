// 로그인 상태와 로그인/로그아웃 동작을 담는 전역 컨텍스트 정의. Provider는 AuthProvider가 맡는다.
import { createContext } from 'react'
import type { AuthUser } from '@/api/auth-storage'

export interface AuthContextValue {
  isAuthenticated: boolean
  user: AuthUser | null
  signIn: (accessToken: string, user: AuthUser, persist: boolean) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

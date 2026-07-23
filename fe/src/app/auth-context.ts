import { createContext } from 'react'
import type { AuthUser } from '@/api/auth-storage'

export interface AuthContextValue {
  isAuthenticated: boolean
  user: AuthUser | null
  signIn: (accessToken: string, user: AuthUser, persist: boolean) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

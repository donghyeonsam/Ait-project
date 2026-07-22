import { createContext } from 'react'

export interface AuthContextValue {
  isAuthenticated: boolean
  signIn: (persist: boolean) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

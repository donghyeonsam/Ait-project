import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearStoredAuth,
  readStoredAuth,
  writeStoredAuth,
  type AuthUser,
} from '@/api/auth-storage'
import { unauthorizedEvent } from '@/api/http'
import { AuthContext } from '@/app/auth-context'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(
    () => readStoredAuth()?.user ?? null,
  )

  const signIn = useCallback((accessToken: string, nextUser: AuthUser, persist: boolean) => {
    writeStoredAuth(accessToken, nextUser, persist)
    setUser(nextUser)
  }, [])

  const signOut = useCallback(() => {
    clearStoredAuth()
    setUser(null)
  }, [])

  useEffect(() => {
    window.addEventListener(unauthorizedEvent, signOut)
    return () => window.removeEventListener(unauthorizedEvent, signOut)
  }, [signOut])

  const value = useMemo(
    () => ({ isAuthenticated: user !== null, user, signIn, signOut }),
    [signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

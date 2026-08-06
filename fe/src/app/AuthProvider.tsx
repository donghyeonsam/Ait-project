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

// 로그인 상태를 앱 전역에 제공한다. 초기값은 저장소에서 복원하고, 로그인/로그아웃 시 저장소와 동기화한다.
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

  // 로그인 이후 바뀐 값(예: 프로필 사진)을 저장소와 컨텍스트 상태 양쪽에 반영한다.
  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((current) => {
      if (!current) return current
      const next = { ...current, ...patch }
      const stored = readStoredAuth()
      if (stored) writeStoredAuth(stored.accessToken, next, stored.persist)
      return next
    })
  }, [])

  // HTTP 계층이 401(토큰 재발급 실패)을 알리면 자동으로 로그아웃 처리한다.
  useEffect(() => {
    window.addEventListener(unauthorizedEvent, signOut)
    return () => window.removeEventListener(unauthorizedEvent, signOut)
  }, [signOut])

  const value = useMemo(
    () => ({ isAuthenticated: user !== null, user, signIn, signOut, updateUser }),
    [signIn, signOut, updateUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

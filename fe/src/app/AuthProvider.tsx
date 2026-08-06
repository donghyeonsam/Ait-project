import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearStoredAuth,
  readStoredAuth,
  writeStoredAuth,
  type AuthUser,
} from '@/api/auth-storage'
import { unauthorizedEvent } from '@/api/http'
import { getMyPageProfile } from '@/api/my-page'
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

  // 로그인 응답에는 아직 프로필 사진이 안 내려와 로그인 직후에는 항상 비어 있다.
  // 마이페이지 조회로 한 번 채워두면, 다음부터는 값이 있으니(null 포함) 다시 요청하지 않는다.
  useEffect(() => {
    if (!user || user.profileImageUrl !== undefined) return

    let cancelled = false
    getMyPageProfile()
      .then((profile) => {
        if (!cancelled) updateUser({ profileImageUrl: profile.profileImageUrl })
      })
      .catch(() => {
        // 동기화 실패는 조용히 넘어가고 다음 로그인 때 다시 시도한다.
      })

    return () => {
      cancelled = true
    }
  }, [user, updateUser])

  const value = useMemo(
    () => ({ isAuthenticated: user !== null, user, signIn, signOut, updateUser }),
    [signIn, signOut, updateUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from '@/app/auth-context'

const authStorageKey = 'ait.authenticated'

function readAuthentication() {
  return (
    window.localStorage.getItem(authStorageKey) === 'true' ||
    window.sessionStorage.getItem(authStorageKey) === 'true'
  )
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(readAuthentication)

  const signIn = useCallback((persist: boolean) => {
    window.localStorage.removeItem(authStorageKey)
    window.sessionStorage.removeItem(authStorageKey)

    const storage = persist ? window.localStorage : window.sessionStorage
    storage.setItem(authStorageKey, 'true')
    setIsAuthenticated(true)
  }, [])

  const signOut = useCallback(() => {
    window.localStorage.removeItem(authStorageKey)
    window.sessionStorage.removeItem(authStorageKey)
    setIsAuthenticated(false)
  }, [])

  const value = useMemo(
    () => ({ isAuthenticated, signIn, signOut }),
    [isAuthenticated, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

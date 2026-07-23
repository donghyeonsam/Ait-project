export interface AuthUser {
  userId: number
  email: string
  nickname: string
  role: string
}

export interface StoredAuth {
  accessToken: string
  user: AuthUser
  persist: boolean
}

const tokenKey = 'ait.access-token'
const userKey = 'ait.user'

function readFrom(storage: Storage, persist: boolean): StoredAuth | null {
  const accessToken = storage.getItem(tokenKey)
  const rawUser = storage.getItem(userKey)
  if (!accessToken || !rawUser) return null

  try {
    return {
      accessToken,
      user: JSON.parse(rawUser) as AuthUser,
      persist,
    }
  } catch {
    storage.removeItem(tokenKey)
    storage.removeItem(userKey)
    return null
  }
}

export function readStoredAuth(): StoredAuth | null {
  return (
    readFrom(window.localStorage, true) ??
    readFrom(window.sessionStorage, false)
  )
}

export function writeStoredAuth(
  accessToken: string,
  user: AuthUser,
  persist: boolean,
) {
  clearStoredAuth()
  const storage = persist ? window.localStorage : window.sessionStorage
  storage.setItem(tokenKey, accessToken)
  storage.setItem(userKey, JSON.stringify(user))
}

export function clearStoredAuth() {
  window.localStorage.removeItem(tokenKey)
  window.localStorage.removeItem(userKey)
  window.sessionStorage.removeItem(tokenKey)
  window.sessionStorage.removeItem(userKey)
}

export function getStoredAccessToken() {
  return readStoredAuth()?.accessToken ?? null
}

export function updateStoredAccessToken(accessToken: string) {
  const storedAuth = readStoredAuth()
  if (!storedAuth) return false

  writeStoredAuth(accessToken, storedAuth.user, storedAuth.persist)
  return true
}

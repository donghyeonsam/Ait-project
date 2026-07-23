import type { AuthUser } from '@/api/auth-storage'
import { backendRequest } from '@/api/http'

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: AuthUser
}

export interface SignupRequest {
  email: string
  password: string
  name: string
  nickname: string
}

// 회원가입 성공 시 BE는 201과 빈 data를 반환한다.
export function signup(request: SignupRequest) {
  return backendRequest<void>('/api/auth/signup', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(request),
  })
}

export function login(email: string, password: string) {
  return backendRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return backendRequest<void>('/api/auth/logout', {
    method: 'POST',
  })
}

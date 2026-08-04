// 회원가입·로그인·로그아웃 인증 API 호출을 모아둔 모듈.
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

export interface OAuthLoginResponse {
  accessToken: string
  expireTime: number
  isNewUser: boolean
  user: AuthUser
}

// 회원가입 성공 시 BE는 201과 빈 data를 반환한다.
export function signup(request: SignupRequest) {
  return backendRequest<void>('/api/auth/signup', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(request),
  })
}

export interface EmailVerificationResult {
  verified: boolean
}

// 회원가입용 이메일 인증코드 발송. 이미 가입된 이메일이면 BE가 에러로 거절한다.
export function sendSignupEmailCode(email: string) {
  return backendRequest<void>('/api/auth/email/send', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({ email }),
  })
}

export function verifySignupEmailCode(email: string, verificationCode: string) {
  return backendRequest<EmailVerificationResult>('/api/auth/email/verify', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({ email, verificationCode }),
  })
}

export function login(email: string, password: string) {
  return backendRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({ email, password }),
  })
}

export function loginWithGoogle(code: string, redirectUri: string) {
  return backendRequest<OAuthLoginResponse>('/api/oauth/google', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({ code, redirectUri }),
  })
}

export function loginWithGithub(code: string, redirectUri: string) {
  return backendRequest<OAuthLoginResponse>('/api/oauth/github', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({ code, redirectUri }),
  })
}

export function logout() {
  return backendRequest<void>('/api/auth/logout', {
    method: 'POST',
  })
}

export function deleteAccount(password: string) {
  return backendRequest<void>('/api/users/withdraw', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
}

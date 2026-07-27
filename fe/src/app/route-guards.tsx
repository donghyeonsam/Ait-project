import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { useAuth } from '@/lib/useAuth'

interface RouteGuardProps {
  children: ReactNode
}

// 루트("/") 진입 처리. 로그인 상태면 대시보드로, 아니면 랜딩 페이지를 보여준다.
export function HomeRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

// 로그인 사용자는 접근할 필요가 없는 화면(로그인·회원가입) 가드. 이미 로그인했으면 대시보드로 보낸다.
export function GuestOnlyRoute({ children }: RouteGuardProps) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

// 인증이 필요한 화면 가드. 비로그인 시 로그인 페이지로 보내되, 원래 가려던 경로를 state.from에 담아 복귀를 돕는다.
export function ProtectedRoute({ children }: RouteGuardProps) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }

  return children
}

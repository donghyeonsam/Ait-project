import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { useAuth } from '@/lib/useAuth'

interface RouteGuardProps {
  children: ReactNode
}

export function HomeRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

export function GuestOnlyRoute({ children }: RouteGuardProps) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

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

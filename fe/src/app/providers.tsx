import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/AuthProvider'

interface AppProvidersProps {
  children: ReactNode
}

// 앱 전역 프로바이더를 한곳에 모은다. 라우터와 인증 컨텍스트를 순서대로 감싼다.
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  )
}

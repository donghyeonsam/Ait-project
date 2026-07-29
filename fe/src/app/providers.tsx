import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/AuthProvider'

interface AppProvidersProps {
  children: ReactNode
}

// 앱 전역 프로바이더를 한곳에 모은다. 라우터와 인증 컨텍스트를 순서대로 감싼다.
// MotionConfig reducedMotion="user"는 OS의 동작 줄이기 설정 시 이동·스케일 모션을 자동 제거한다.
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>{children}</AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}

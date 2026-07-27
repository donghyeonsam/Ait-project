import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'

// 앱 최상위 컴포넌트. 전역 프로바이더로 라우터를 감싼다.
export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}

import type { ReactNode } from 'react'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: ReactNode
  contentClassName?: string
  hideFooter?: boolean
}

// 로그인 후 화면의 공통 레이아웃. 헤더·본문·푸터를 배치하고 본문 최대 폭만 페이지별로 조정한다.
export function PageLayout({
  children,
  contentClassName,
  hideFooter = false,
}: PageLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-surface-default text-text-primary">
      <Header />
      <main id="main-content" className="w-full flex-1">
        <div className={cn('mx-auto max-w-content px-8', contentClassName)}>
          {children}
        </div>
      </main>
      {hideFooter ? null : <Footer />}
    </div>
  )
}

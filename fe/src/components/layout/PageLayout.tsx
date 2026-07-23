import type { ReactNode } from 'react'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: ReactNode
  contentClassName?: string
  hideFooter?: boolean
}

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

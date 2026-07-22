import type { ReactNode } from 'react'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

interface PageLayoutProps {
  children: ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background-default text-text-primary">
      <Header />
      <main id="main-content" className="w-full flex-1">
        <div className="mx-auto max-w-content px-8">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

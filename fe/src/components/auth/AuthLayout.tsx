import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import authPanelWave from '@/assets/images/auth/auth-panel-wave.svg'
import { Header } from '@/components/layout/Header'

interface AuthLayoutProps {
  aside?: ReactNode
  children: ReactNode
  showFooter?: boolean
  showWave?: boolean
}

export function AuthLayout({
  aside,
  children,
  showFooter = false,
  showWave = false,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background-default text-text-primary">
      <Header />

      <main id="main-content" className="flex flex-1 items-start px-4 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto flex w-full max-w-dashboard flex-col">
          {aside ? (
            <div className="grid gap-6 lg:grid-cols-[11fr_9fr] lg:gap-8">
              <section className="relative hidden overflow-hidden rounded-ait-l border border-border-default bg-status-neutral-surface shadow-elevation-1 lg:flex">
                {showWave ? (
                  <img
                    src={authPanelWave}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 w-full text-status-achievement"
                  />
                ) : null}
                <div className="relative z-[var(--z-index-base)] flex w-full flex-col p-8">
                  {aside}
                </div>
              </section>

              <div className="mx-auto w-full max-w-md lg:max-w-none">{children}</div>
            </div>
          ) : (
            <div className="w-full">{children}</div>
          )}

          {showFooter ? (
            <footer className="mt-6 flex flex-wrap items-center justify-center gap-3 text-caption text-text-secondary">
              <span>© 2026 Ait. All rights reserved.</span>
              <span className="h-3 w-px bg-border-default" aria-hidden="true" />
              <Link
                to="/terms"
                className="transition-colors hover:text-action-primary [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]"
              >
                이용약관
              </Link>
              <span className="h-3 w-px bg-border-default" aria-hidden="true" />
              <Link
                to="/privacy"
                className="transition-colors hover:text-action-primary [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]"
              >
                개인정보처리방침
              </Link>
            </footer>
          ) : null}
        </div>
      </main>
    </div>
  )
}

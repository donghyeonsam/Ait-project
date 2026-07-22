import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const landingNavigationItems = [
  { label: 'AI 모의면접', to: '/interviews' },
  { label: '면접 스터디', to: '/study' },
  { label: '커뮤니티', to: '/community' },
]

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-index-sticky)] h-[var(--header-height-compact)] border-b border-border-default bg-surface-default lg:h-[var(--header-height-wide)]">
      <div className="mx-auto flex h-full max-w-content items-center px-4 lg:px-6">
        <Link
          to="/"
          className="-ml-3 shrink-0 p-3"
          aria-label="Ait 홈"
        >
          <img
            src="/Logo_Assets/primary/ait-logo-horizontal.svg"
            alt="Ait"
            className="h-6 w-auto"
          />
        </Link>

        <nav className="ml-6 hidden items-center gap-2 lg:flex" aria-label="랜딩 메뉴">
          {landingNavigationItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-ait-s px-3 py-2 text-body-2 text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="text"
            className="px-2 py-2 font-normal text-text-secondary"
          >
            로그인
          </Button>
          <Button
            type="button"
            variant="text"
            className="px-2 py-2 font-normal text-text-secondary"
          >
            회원가입
          </Button>
        </div>
      </div>
    </header>
  )
}

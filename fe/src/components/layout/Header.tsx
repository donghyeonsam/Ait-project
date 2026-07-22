import { Bell, Menu, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navigationItems = [
  { label: '대시보드', to: '/dashboard' },
  { label: 'AI 모의면접', to: '/interviews' },
  { label: '스터디 라운지', to: '/study' },
  { label: '커뮤니티', to: '/community' },
]

const navigationLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-ait-s px-3 py-2 text-body-2 transition-colors [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]',
    isActive
      ? 'bg-status-neutral-surface font-semibold text-action-primary'
      : 'text-text-secondary hover:bg-status-neutral-surface hover:text-action-primary',
  )

export function Header() {
  return (
    <header className="sticky top-0 z-[var(--z-index-sticky)] h-[var(--header-height-compact)] border-b border-border-default bg-surface-default lg:h-[var(--header-height-wide)]">
      <div className="mx-auto grid h-full max-w-content grid-cols-[1fr_auto] items-center px-4 lg:grid-cols-[1fr_auto_1fr] lg:px-6">
        <Link
          to="/dashboard"
          className="-ml-3 w-fit p-3"
          aria-label="Ait 대시보드"
        >
          <img
            src="/Logo_Assets/primary/ait-logo-horizontal.svg"
            alt="Ait"
            className="h-6 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-2 lg:flex" aria-label="주요 메뉴">
          {navigationItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navigationLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="text"
            size="icon"
            className="lg:hidden"
            aria-label="메뉴"
          >
            <Menu aria-hidden="true" />
          </Button>
          <Button type="button" variant="text" size="icon" aria-label="알림">
            <Bell aria-hidden="true" />
          </Button>
          <Avatar aria-label="프로필">
            <AvatarFallback>
              <UserRound className="size-6" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

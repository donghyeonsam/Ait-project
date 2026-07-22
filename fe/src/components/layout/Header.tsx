import { Bell, Menu } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
    'rounded-ait-s px-4 py-2 text-body-1 transition-colors [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]',
    isActive
      ? 'font-semibold text-action-primary'
      : 'text-text-secondary hover:bg-status-neutral-surface hover:text-action-primary',
  )

export function Header() {
  return (
    <header className="sticky top-0 z-[var(--z-index-sticky)] h-[var(--header-height-compact)] border-b border-border-default bg-surface-default shadow-elevation-1 lg:h-[var(--header-height-wide)]">
      <div className="mx-auto grid h-full max-w-dashboard grid-cols-[1fr_auto] items-center px-8 lg:grid-cols-[1fr_auto_1fr]">
        <Link
          to="/dashboard"
          className="-ml-3 w-fit p-3"
          aria-label="Ait 대시보드"
        >
          <img
            src="/Logo_Assets/primary/ait-logo-horizontal.svg"
            alt="Ait"
            className="h-12 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="주요 메뉴">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to !== '/dashboard'}
              className={navigationLinkClass}
            >
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
          <Link to="/mypage" className="rounded-ait-pill" aria-label="마이페이지로 이동">
            <Avatar className="size-10">
              <AvatarImage src="/mypage/profile-kimssafy.png" alt="" className="object-cover" />
              <AvatarFallback className="border-0 bg-profile-avatar">
                김
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  )
}

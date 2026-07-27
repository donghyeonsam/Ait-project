import { Bell, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { logout } from '@/api/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/useAuth'

const navigationItems = [
  { label: '대시보드', to: '/dashboard' },
  { label: 'AI 모의면접', to: '/interviews' },
  { label: '스터디 라운지', to: '/study' },
  { label: '커뮤니티', to: '/community' },
]

const navigationLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative rounded-ait-s px-4 py-2 text-body-1 transition-colors [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]',
    isActive
      ? 'font-semibold text-action-primary after:absolute after:inset-x-4 after:-bottom-1 after:h-px after:bg-status-achievement'
      : 'text-text-secondary hover:bg-status-neutral-surface hover:text-action-primary',
  )

export function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, user, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)
    try {
      await logout()
    } catch {
      // 서버 요청 실패 여부와 관계없이 브라우저의 인증 정보는 정리한다.
    } finally {
      signOut()
      navigate('/', { replace: true })
    }
  }

  return (
    <header className="sticky top-0 z-[var(--z-index-sticky)] h-[var(--header-height-compact)] border-b border-border-default bg-surface-default shadow-elevation-1 lg:h-[var(--header-height-wide)]">
      <div className="mx-auto grid h-full max-w-dashboard grid-cols-[1fr_auto] items-center px-8 lg:grid-cols-[1fr_auto_1fr]">
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          className="-ml-3 w-fit p-3"
          aria-label={isAuthenticated ? 'Ait 대시보드' : 'Ait 랜딩페이지'}
        >
          <img
            src="/Logo_Assets/primary/ait-logo-horizontal.svg"
            alt="Ait"
            className="h-12 w-auto"
          />
        </Link>

        {isAuthenticated ? (
          <nav className="hidden items-center gap-8 lg:flex" aria-label="주요 메뉴">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navigationLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : (
          <span className="hidden lg:block" aria-hidden="true" />
        )}

        <div className="flex items-center justify-end gap-2">
          {isAuthenticated ? (
            <>
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
                  <AvatarFallback className="border-0 bg-profile-avatar">
                    {user?.nickname.slice(0, 1) ?? '홍'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button
                type="button"
                variant="text"
                size="icon"
                onClick={handleSignOut}
                disabled={isSigningOut}
                aria-busy={isSigningOut}
                aria-label={isSigningOut ? '로그아웃 중' : '로그아웃'}
              >
                <LogOut aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="text" className="font-normal text-text-secondary">
                <Link to="/login">로그인</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/signup">회원가입</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

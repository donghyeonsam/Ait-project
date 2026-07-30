import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { landingRoutes } from '@/components/landing/landing.data'
import { cn } from '@/lib/utils'
import '@/components/landing/landing.css'

// 비로그인 랜딩 상단에서 홈 로고와 로그인·회원가입 경로를 제공한다.
export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const updateScrolled = () => setIsScrolled(window.scrollY > 12)
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  return (
    <header
      className={cn(
        'landing-header',
        isScrolled && 'landing-header--scrolled',
      )}
    >
      <div className="landing-shell landing-header__inner">
        <Link to="/" className="landing-header__logo" aria-label="Ait 홈">
          <img
            src="/Logo_Assets/web/ait-logo-horizontal.webp"
            alt="Ait"
            width="1000"
            height="464"
          />
        </Link>

        <nav className="landing-header__auth" aria-label="회원 메뉴">
          <Link to={landingRoutes.login}>로그인</Link>
          <span className="landing-header__divider" aria-hidden="true" />
          <Link to={landingRoutes.start}>회원가입</Link>
        </nav>
      </div>
    </header>
  )
}

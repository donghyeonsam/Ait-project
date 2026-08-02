import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { landingRoutes } from '@/components/landing/landing.data'
import { GooeyNav } from '@/components/reactbits/GooeyNav'
import { cn } from '@/lib/utils'
import '@/components/landing/landing.css'

const sectionAnchors = [
  { label: '기능', href: '#features' },
  { label: '미리보기', href: '#gallery' },
]

// 비로그인 랜딩 상단에서 홈 로고, 섹션 내비게이션, 로그인·회원가입 경로를 제공한다.
export function LandingHeader() {
  const reduceMotion = useReducedMotion()
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState(-1)
  // 클릭으로 스무스 스크롤하는 동안 스크롤 스파이가 중간 섹션을 짚지 않게 잠근다.
  const spyLockUntilRef = useRef(0)

  useEffect(() => {
    const updateOnScroll = () => {
      setIsScrolled(window.scrollY > 12)

      if (Date.now() < spyLockUntilRef.current) return
      const threshold = window.scrollY + window.innerHeight * 0.35
      let next = -1
      sectionAnchors.forEach(({ href }, index) => {
        const section = document.getElementById(href.slice(1))
        if (section && section.offsetTop <= threshold) next = index
      })
      setActiveSection(next)
    }

    updateOnScroll()
    window.addEventListener('scroll', updateOnScroll, { passive: true })
    return () => window.removeEventListener('scroll', updateOnScroll)
  }, [])

  const handleNavSelect = (index: number) => {
    const target = document.getElementById(
      sectionAnchors[index].href.slice(1),
    )
    if (!target) return
    spyLockUntilRef.current = Date.now() + 900
    setActiveSection(index)
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }

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

        <GooeyNav
          className="landing-header__nav"
          items={sectionAnchors}
          activeIndex={activeSection}
          onSelect={handleNavSelect}
        />

        <nav className="landing-header__auth" aria-label="회원 메뉴">
          <Link to={landingRoutes.login}>로그인</Link>
          <span className="landing-header__divider" aria-hidden="true" />
          <Link to={landingRoutes.start}>회원가입</Link>
        </nav>
      </div>
    </header>
  )
}

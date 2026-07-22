import { Link } from 'react-router-dom'

const footerLinks = [
  { label: '이용약관', to: '/terms' },
  { label: '개인정보처리방침', to: '/privacy' },
  { label: '녹화 · AI 분석 안내', to: '/recording-notice' },
]

export function Footer() {
  return (
    <footer className="border-t border-border-default bg-surface-default">
      <div className="mx-auto max-w-content px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/dashboard"
              className="-m-3 p-3"
              aria-label="Ait 대시보드"
            >
              <img
                src="/Logo_Assets/primary/ait-logo-horizontal.svg"
                alt="Ait"
                className="h-6 w-auto"
              />
            </Link>
            <p className="text-body-2 text-text-secondary">
              면접 준비의 모든 순간을 함께합니다.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-6" aria-label="정책 메뉴">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-body-2 text-text-secondary transition-colors hover:text-action-primary [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-6 border-t border-border-default pt-6 text-caption text-text-secondary">
          © 2026 Ait. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

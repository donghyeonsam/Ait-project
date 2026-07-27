import { cn } from '@/lib/utils'

interface PageIntroProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

// 페이지 상단의 제목·설명을 표시하는 공통 인트로. 준비 중 화면의 자리표시로도 쓴다.
export function PageIntro({
  title,
  description,
  className,
  children,
}: PageIntroProps) {
  return (
    <section className={cn('py-10', className)} aria-labelledby="page-title">
      <h1 id="page-title" className="text-h1 text-text-primary">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-body-1 text-text-secondary">{description}</p>
      ) : null}
      {children}
    </section>
  )
}

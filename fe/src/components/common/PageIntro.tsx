import { cn } from '@/lib/utils'

interface PageIntroProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

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

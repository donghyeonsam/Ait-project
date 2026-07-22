import type { ReactNode } from 'react'
import { useAnimatedNumber } from '@/components/dashboard/useAnimatedNumber'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number
  unit: string
  deltaLabel: string
  deltaDirection?: 'up' | 'down'
  index?: number
  compact?: boolean
  footerLabel?: string
}

export function StatCard({
  icon,
  label,
  value,
  unit,
  deltaLabel,
  deltaDirection = 'up',
  index = 0,
  compact = false,
  footerLabel = '지난 주 대비',
}: StatCardProps) {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.25 })
  const animatedValue = useAnimatedNumber(value, isInView)
  const hasDecimal = !Number.isInteger(value)

  return (
    <article
      ref={ref}
      className={cn(
        'stat-card group rounded-ait-m border border-border-default bg-background-default shadow-elevation-1 transition-[transform,box-shadow] duration-150 ease-standard hover:-translate-y-0.5 hover:shadow-elevation-2',
        compact ? 'p-4' : 'p-4 lg:p-6',
        isInView && 'is-visible',
      )}
      style={{ '--stagger-delay': `${index * 80}ms` } as React.CSSProperties}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary',
            compact ? 'size-12' : 'size-14',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-body-2 text-text-secondary">{label}</p>
          <p className="mt-1 flex items-baseline gap-1 tabular-nums">
            <strong className="text-h2 text-text-primary">
              {hasDecimal ? animatedValue.toFixed(1) : Math.round(animatedValue)}
            </strong>
            <span className="text-caption text-text-primary">{unit}</span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-caption">
        <span className="text-text-secondary">{footerLabel}</span>
        <span
          className={cn(
            'stat-delta inline-flex items-center gap-1 tabular-nums',
            deltaDirection === 'up' ? 'text-stat-up' : 'text-stat-down',
            isInView && 'is-visible',
          )}
        >
          <span aria-hidden="true">{deltaDirection === 'up' ? '▲' : '▼'}</span>
          {deltaLabel}
        </span>
      </div>
    </article>
  )
}

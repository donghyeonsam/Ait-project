import SpecularButton from '@/components/SpecularButton'
import { TagBadge } from '@/components/dashboard/TagBadge'
import { useInView } from '@/lib/useInView'
import type { InterviewRecord } from '@/mocks/dashboard'
import { cn } from '@/lib/utils'

interface InterviewRecordItemProps {
  record: InterviewRecord
  index: number
  onOpenReport: (record: InterviewRecord) => void
}

export function InterviewRecordItem({
  record,
  index,
  onOpenReport,
}: InterviewRecordItemProps) {
  const isUp = record.delta >= 0
  const { ref, isInView } = useInView<HTMLElement>({
    threshold: 0.15,
    rootMargin: '0px 0px -8% 0px',
  })

  return (
    <article
      ref={ref}
      className={cn(
        'record-item grid min-h-28 grid-cols-[1fr_auto_auto] items-center rounded-ait-s border border-chart-axis bg-background-default px-8 py-4 transition-[transform,box-shadow] duration-150 ease-standard hover:-translate-y-0.5 hover:shadow-elevation-2',
        isInView && 'is-visible',
      )}
      style={{ '--record-delay': `${index * 70}ms` } as React.CSSProperties}
    >
      <div className="min-w-0 pr-8">
        <div className="flex items-center gap-4">
          <time className="tabular-nums text-body-2 text-text-secondary">
            {record.date}
          </time>
          <TagBadge variant={record.type} className="bg-surface-default ring-1 ring-border-default" />
        </div>
        <h3 className="mt-2 truncate text-h3 font-semibold">{record.title}</h3>
      </div>

      <div className="flex min-w-52 items-center justify-center gap-4 border-x border-border-default px-8">
        <strong className="tabular-nums text-h1">{record.score.toFixed(1)}</strong>
        <div className="text-caption">
          <p
            className={cn(
              'tabular-nums',
              isUp ? 'text-stat-up' : 'text-stat-down',
            )}
          >
            <span aria-hidden="true">{isUp ? '▲' : '▼'}</span>{' '}
            {isUp ? '+' : ''}{record.delta.toFixed(1)}점
          </p>
          <p className="mt-1 text-text-secondary">지난 면접 대비</p>
        </div>
      </div>

      <div className="pl-8">
        <SpecularButton
          type="button"
          size="sm"
          radius={8}
          tint="var(--color-surface-default)"
          tintOpacity={1}
          textColor="var(--color-action-primary)"
          lineColor="var(--color-surface-default)"
          baseColor="var(--color-action-primary)"
          intensity={1.4}
          shineSize={16}
          shineFade={32}
          proximity={180}
          className="min-w-28"
          onClick={() => onOpenReport(record)}
          aria-label={`${record.title} 리포트 보기`}
        >
          리포트 보기
        </SpecularButton>
      </div>
    </article>
  )
}

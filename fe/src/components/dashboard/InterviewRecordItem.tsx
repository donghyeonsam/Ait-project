import { Loader2 } from 'lucide-react'
import BorderGlow from '@/components/BorderGlow'
import { TagBadge } from '@/components/dashboard/TagBadge'
import { Button } from '@/components/ui/button'
import { useInView } from '@/lib/useInView'
import type { InterviewRecord } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface InterviewRecordItemProps {
  record: InterviewRecord
  index: number
  onOpenReport: (record: InterviewRecord) => void
}

// 대시보드의 면접 기록 한 건. 분석 중이면 로딩 카드를, 완료면 점수·증감과 리포트 버튼을 보여준다.
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

  if (record.status === 'analyzing') {
    return (
      <div
        className="flex min-h-28 items-center gap-4 rounded-ait-m border border-status-info-border bg-status-info-surface px-8 py-4"
        role="status"
        aria-live="polite"
      >
        <span className="analyzing-shimmer flex size-12 shrink-0 items-center justify-center rounded-ait-pill">
          <Loader2 className="size-5 animate-spin text-action-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <TagBadge variant={record.type} className="bg-surface-default ring-1 ring-border-default" />
            <span className="text-caption font-medium text-status-info">분석 중</span>
          </div>
          <h3 className="mt-2 truncate text-h3 font-semibold">{record.title}</h3>
          <p className="mt-1 text-body-2 text-text-secondary">AI가 답변을 분석하고 있어요. 완료되면 자동으로 결과가 채워져요.</p>
        </div>
      </div>
    )
  }

  return (
    <BorderGlow
      observeRef={(node) => {
        ref.current = node
      }}
      borderRadius={28}
      edgeSensitivity={30}
      glowColor="40 80 80"
      backgroundColor="#F8FAFC"
      glowRadius={40}
      glowIntensity={1}
      coneSpread={25}
      colors={['#c084fc', '#f472b6', '#38bdf8']}
      fillOpacity={1}
      className={cn(
        'record-item shadow-elevation-1 transition-[transform,box-shadow] duration-150 ease-standard hover:-translate-y-0.5 hover:shadow-elevation-2',
        isInView && 'is-visible',
      )}
      contentClassName="grid min-h-28 grid-cols-[1fr_auto_auto] items-center px-8 py-4"
      style={{ '--record-delay': `${index * 10}ms` } as React.CSSProperties}
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
        <Button
          type="button"
          variant="secondary"
          className="min-w-28"
          onClick={() => onOpenReport(record)}
          aria-label={`${record.title} 리포트 보기`}
        >
          리포트 보기
        </Button>
      </div>
    </BorderGlow>
  )
}

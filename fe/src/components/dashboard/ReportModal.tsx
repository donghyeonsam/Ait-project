import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Play, ThumbsUp, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAnimatedNumber } from '@/components/dashboard/useAnimatedNumber'
import type { InterviewRecord } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface ReportModalProps {
  open: boolean
  record: InterviewRecord
  onClose: () => void
}

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const radarAxes = [
  { label: '전문성', score: 8.4 },
  { label: '논리성', score: 8.8 },
  { label: '전달력', score: 6.7 },
  { label: '시선처리', score: 5.4 },
  { label: '답변 구조', score: 8.1 },
  { label: '직무 역량', score: 8.5 },
]

function polarPoint(index: number, radius: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 6
  return `${120 + Math.cos(angle) * radius},${110 + Math.sin(angle) * radius}`
}

const gridLevels = [24, 48, 72, 88]
const dataPolygon = radarAxes
  .map((axis, index) => polarPoint(index, (axis.score / 10) * 88))
  .join(' ')

function RadarChart({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-56">
      <svg
        viewBox="0 0 240 220"
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-labelledby="radar-title radar-description"
      >
        <title id="radar-title">역량 분석</title>
        <desc id="radar-description">
          전문성 8.4점, 논리성 8.8점, 전달력 6.7점, 시선처리 5.4점,
          답변 구조 8.1점, 직무 역량 8.5점입니다.
        </desc>
        {gridLevels.map((radius) => (
          <polygon
            key={radius}
            points={radarAxes.map((_, index) => polarPoint(index, radius)).join(' ')}
            fill="none"
            stroke="var(--color-chart-grid)"
          />
        ))}
        {radarAxes.map((_, index) => (
          <line
            key={index}
            x1="120"
            y1="110"
            x2={polarPoint(index, 88).split(',')[0]}
            y2={polarPoint(index, 88).split(',')[1]}
            stroke="var(--color-chart-grid)"
          />
        ))}
        <polygon
          points={dataPolygon}
          fill="var(--color-radar-fill)"
          stroke="var(--color-radar-stroke)"
          strokeWidth="2"
          className={cn('radar-polygon', active && 'is-visible')}
        />
        {radarAxes.map((axis, index) => {
          const [x, y] = polarPoint(index, 111).split(',').map(Number)
          return (
            <text
              key={axis.label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--color-text-secondary)"
              fontSize="13"
              className={cn('radar-label', active && 'is-visible')}
            >
              {axis.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

interface QuestionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function ReportQuestion({ title, defaultOpen = false, children }: QuestionProps) {
  const [expanded, setExpanded] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-ait-s border border-border-default bg-surface-default">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-body-1 font-medium transition-colors hover:bg-status-neutral-surface"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {title}
        <ChevronDown
          className={cn(
            'size-5 shrink-0 transition-transform duration-250 ease-standard',
            expanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      <div className={cn('accordion-content', expanded && 'is-open')}>
        <div className="min-h-0">
          <div className="border-t border-border-default px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function ReportModal({ open, record, onClose }: ReportModalProps) {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const animatedScore = useAnimatedNumber(record.score, open)

  useEffect(() => {
    if (!open) {
      return
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    const previousMarginRight = document.body.style.marginRight
    const previousScrollbarSize = document.body.style.getPropertyValue(
      '--removed-body-scroll-bar-size',
    )
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth

    if (scrollbarWidth > 0) {
      const currentMarginRight =
        Number.parseFloat(getComputedStyle(document.body).marginRight) || 0
      document.body.style.marginRight = `${currentMarginRight + scrollbarWidth}px`
      document.body.style.setProperty(
        '--removed-body-scroll-bar-size',
        `${scrollbarWidth}px`,
      )
    }
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!first || !last) {
        return
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      document.body.style.marginRight = previousMarginRight
      if (previousScrollbarSize) {
        document.body.style.setProperty(
          '--removed-body-scroll-bar-size',
          previousScrollbarSize,
        )
      } else {
        document.body.style.removeProperty('--removed-body-scroll-bar-size')
      }
      previousFocusRef.current?.focus()
    }
  }, [onClose, open])

  return (
    <div
      className={cn('report-overlay', open && 'is-open')}
      aria-hidden={!open}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        className={cn('report-dialog', open && 'is-open')}
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-labelledby="report-title"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-10 pb-6 pt-10">
          <header>
            <h2 id="report-title" className="text-h2">
              {record.title}
            </h2>
            <p className="mt-3 flex flex-wrap items-center gap-3 text-body-2 text-text-secondary">
              <time>{record.date}</time>
              <span aria-hidden="true">·</span>
              <span>{record.type} 면접</span>
              <span aria-hidden="true">·</span>
              <span>{record.duration}</span>
            </p>
          </header>

          <section className="mt-6 grid grid-cols-[0.9fr_2.1fr] rounded-ait-s border border-border-default p-6" aria-label="면접 종합 분석">
            <div className="flex min-h-56 flex-col items-center justify-start border-r border-chart-axis pr-6 text-center">
              <h3 className="text-body-1 font-medium">종합 점수</h3>
              <p className="mt-8 flex items-baseline gap-3 tabular-nums">
                <strong className="text-report-score text-status-achievement">
                  {animatedScore.toFixed(1)}
                </strong>
                <span className="text-h2 font-normal text-text-secondary">/ 10</span>
              </p>
              <p className="mt-6 text-body-2 text-text-secondary">
                <span className="mr-2 text-stat-up" aria-hidden="true">▲</span>
                이전보다 <span className="text-stat-up">1.2점 상승</span>
              </p>
            </div>
            <div className="pl-6">
              <h3 className="text-body-1 font-medium">역량 분석</h3>
              <RadarChart active={open} />
            </div>
          </section>

          <section className="mt-4 grid grid-cols-2 gap-8" aria-label="종합 피드백">
            <article className="rounded-ait-s border border-status-success bg-feedback-success p-4">
              <h3 className="flex items-center gap-3 text-body-1 font-medium">
                <ThumbsUp className="size-8 text-status-success" aria-hidden="true" />
                잘한 점
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-body-2">
                <li>핵심부터 말해 답변 구조가 명확했어요.</li>
                <li>기술 선택의 이유가 구체적이었어요.</li>
              </ul>
            </article>
            <article className="rounded-ait-s border border-feedback-improve-border bg-feedback-improve p-4">
              <h3 className="flex items-center gap-3 text-body-1 font-medium">
                <TrendingUp className="size-8 text-feedback-improve-text" aria-hidden="true" />
                개선하면 좋은 점
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-body-2">
                <li>성과를 수치 중심으로 설명해보세요.</li>
                <li>카메라 시선을 조금 더 유지해보세요.</li>
              </ul>
            </article>
          </section>

          <section className="mt-8" aria-labelledby="question-feedback-title">
            <h3 id="question-feedback-title" className="mb-4 text-body-1 font-medium">
              질문별 피드백
            </h3>
            <div className="space-y-4">
              <ReportQuestion
                defaultOpen
                title="Q1. 프로젝트에서 가장 어려웠던 기술적 문제는 무엇이었나요?"
              >
                <div className="grid grid-cols-3 divide-x divide-chart-axis">
                  <div className="pr-6">
                    <h4 className="text-body-2 font-medium">내 답변</h4>
                    <p className="mt-3 text-body-2 leading-7 text-text-secondary">
                      프로젝트 초기, 대용량 데이터 처리 성능 문제가 가장 어려웠습니다.
                      API 응답시간이 길어져 사용자 경험에 영향을 주었습니다.
                    </p>
                  </div>
                  <div className="px-6">
                    <h4 className="text-body-2 font-medium">근거</h4>
                    <p className="mt-3 text-body-2 leading-7 text-text-secondary">
                      문제의 원인과 해결 방법이 구체적으로 설명되었고, 본인이 한
                      역할이 명확합니다. 기술 선택의 이유가 논리적으로 전달됐습니다.
                    </p>
                  </div>
                  <div className="pl-6">
                    <h4 className="text-body-2 font-medium">연습 제안</h4>
                    <p className="mt-3 text-body-2 leading-7 text-text-secondary">
                      성과를 수치로 제시하면 더 설득력이 높아집니다. 예를 들어 응답
                      시간을 800ms에서 200ms로 개선한 결과를 덧붙여보세요.
                    </p>
                  </div>
                </div>
              </ReportQuestion>
              <ReportQuestion title="Q2. React 상태 관리 방식을 선택한 기준을 설명해주세요.">
                <div className="grid grid-cols-3 divide-x divide-chart-axis">
                  <p className="pr-6 text-body-2 text-text-secondary">상태의 범위와 변경 빈도를 기준으로 선택했습니다.</p>
                  <p className="px-6 text-body-2 text-text-secondary">전역 상태와 서버 상태를 구분한 점이 명확했어요.</p>
                  <p className="pl-6 text-body-2 text-text-secondary">프로젝트 사례를 한 가지 덧붙여 연습해보세요.</p>
                </div>
              </ReportQuestion>
            </div>
          </section>

          <p className="mt-4 text-caption text-text-secondary">
            AI 분석 결과는 면접 연습을 위한 참고 자료입니다.
          </p>
        </div>

        <footer className="flex items-center justify-between border-t border-chart-axis bg-surface-default px-10 py-3">
          <Button type="button" variant="secondary" className="min-w-44 font-medium">
            <Play className="size-5" aria-hidden="true" />
            영상 다시보기
          </Button>
          <div className="flex items-center gap-4">
            <Button
              ref={closeButtonRef}
              type="button"
              variant="secondary"
              className="min-w-32 font-medium"
              onClick={onClose}
            >
              닫기
            </Button>
            <Button
              type="button"
              className="min-w-40"
              onClick={() => navigate('/interviews')}
            >
              다시 연습하기
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

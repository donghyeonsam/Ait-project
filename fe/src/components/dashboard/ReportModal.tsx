import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, ChevronDown, Play, ThumbsUp, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getInterviewReportDetail,
  type InterviewReportDetail,
} from '@/api/ai-interviews'
import { toErrorMessage } from '@/api/http'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

interface RadarAxis {
  label: string
  score: number
}

// 리포트 상세 점수를 레이더 축 순서(시선→표정→목소리→질의응답→문장구성)로 배열한다.
const toRadarAxes = (detail: InterviewReportDetail): RadarAxis[] => [
  { label: '시선', score: detail.eyeContactScore },
  { label: '표정', score: detail.faceScore },
  { label: '목소리', score: detail.voiceScore },
  { label: '질의응답', score: detail.qnaScore },
  { label: '문장구성', score: detail.sentenceScore },
]

// 레이더의 index번째 꼭짓점 좌표. 12시 방향(-90°)부터 시계방향으로 축 개수만큼 등분해 배치한다.
function polarPoint(index: number, radius: number, axisCount: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisCount
  return `${120 + Math.cos(angle) * radius},${110 + Math.sin(angle) * radius}`
}

const gridLevels = [24, 48, 72, 88]

function RadarChart({ axes, active }: { axes: RadarAxis[]; active: boolean }) {
  const dataPolygon = axes
    .map((axis, index) =>
      polarPoint(index, (Math.min(Math.max(axis.score, 0), 10) / 10) * 88, axes.length),
    )
    .join(' ')

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
          {axes.map((axis) => `${axis.label} ${axis.score.toFixed(1)}점`).join(', ')}
          입니다.
        </desc>
        {gridLevels.map((radius) => (
          <polygon
            key={radius}
            points={axes.map((_, index) => polarPoint(index, radius, axes.length)).join(' ')}
            fill="none"
            stroke="var(--color-chart-grid)"
          />
        ))}
        {axes.map((_, index) => (
          <line
            key={index}
            x1="120"
            y1="110"
            x2={polarPoint(index, 88, axes.length).split(',')[0]}
            y2={polarPoint(index, 88, axes.length).split(',')[1]}
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
        {axes.map((axis, index) => {
          const [x, y] = polarPoint(index, 111, axes.length).split(',').map(Number)
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

type ReportDetailState =
  | { status: 'idle' }
  | { status: 'loaded'; detail: InterviewReportDetail }
  | { status: 'error'; message: string }

// 면접 결과 리포트 모달. 종합 점수·역량 레이더·질문별 피드백을 보여준다.
// 접근성을 위해 열려 있는 동안 포커스를 모달 안에 가두고 Esc로 닫는다.
export function ReportModal({ open, record, onClose }: ReportModalProps) {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const animatedScore = useAnimatedNumber(record.score, open)
  const [detailState, setDetailState] = useState<ReportDetailState>({
    status: 'idle',
  })
  const [requestKey, setRequestKey] = useState(0)

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false

    getInterviewReportDetail(record.id)
      .then((detail) => {
        if (!cancelled) setDetailState({ status: 'loaded', detail })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDetailState({ status: 'error', message: toErrorMessage(error) })
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, record.id, requestKey])

  // 다른 기록을 열면 이전 상세가 잠깐 보이지 않도록 현재 기록의 상세만 사용한다.
  const detail =
    detailState.status === 'loaded' &&
    detailState.detail.aiInterviewId === record.id
      ? detailState.detail
      : null
  const detailError = detailState.status === 'error' ? detailState.message : null
  const isDetailLoading = !detail && !detailError

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
    // 배경 스크롤을 잠글 때 스크롤바 폭만큼 오른쪽 여백을 더해 레이아웃이 밀리지 않게 한다.
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

      // Tab 포커스가 모달 밖으로 나가지 않도록 첫/마지막 요소 사이를 순환시킨다.
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

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="report-overlay"
          initial={shouldReduceMotion ? false : { opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(2px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose()
            }
          }}
        >
          <motion.div
            ref={dialogRef}
            layoutId={
              shouldReduceMotion ? undefined : `interview-report-${record.id}`
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    layout: {
                      type: 'spring',
                      stiffness: 280,
                      damping: 30,
                      mass: 0.85,
                    },
                  }
            }
            className="report-dialog"
            data-report-dialog={record.id}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
          >
            <div className="report-dialog__body min-h-0 flex-1 overflow-y-auto px-10 pb-6 pt-10">
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

          {detailError ? (
            <section className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-ait-s border border-border-default p-6 text-center" aria-label="리포트 조회 오류">
              <AlertCircle className="size-8 text-status-error" aria-hidden="true" />
              <h3 className="mt-4 text-h3">리포트를 불러오지 못했습니다</h3>
              <p className="mt-2 text-body-2 text-text-secondary">{detailError}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-6 min-w-32"
                onClick={() => {
                  setDetailState({ status: 'idle' })
                  setRequestKey((key) => key + 1)
                }}
              >
                다시 시도
              </Button>
            </section>
          ) : (
            <>
              <section className="report-summary mt-6 grid grid-cols-[0.9fr_2.1fr] rounded-ait-s border border-border-default p-6" aria-label="면접 종합 분석">
                <div className="report-score-panel flex min-h-56 flex-col items-center justify-start border-r border-chart-axis pr-6 text-center">
                  <h3 className="text-body-1 font-medium">종합 점수</h3>
                  <p className="mt-8 flex items-baseline gap-3 tabular-nums">
                    <strong className="text-report-score text-status-achievement">
                      {animatedScore.toFixed(1)}
                    </strong>
                    <span className="text-h2 font-normal text-text-secondary">/ 10</span>
                  </p>
                  <p className="mt-6 text-body-2 text-text-secondary">
                    {record.delta === 0 ? (
                      '직전 면접과 점수 차이가 없어요'
                    ) : record.delta > 0 ? (
                      <>
                        <span className="mr-2 text-stat-up" aria-hidden="true">▲</span>
                        이전보다 <span className="text-stat-up">{record.delta.toFixed(1)}점 상승</span>
                      </>
                    ) : (
                      <>
                        <span className="mr-2 text-stat-down" aria-hidden="true">▼</span>
                        이전보다 <span className="text-stat-down">{Math.abs(record.delta).toFixed(1)}점 하락</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="report-radar-panel pl-6">
                  <h3 className="text-body-1 font-medium">역량 분석</h3>
                  {detail ? (
                    <RadarChart axes={toRadarAxes(detail)} active={open} />
                  ) : (
                    <div className="flex justify-center pt-4" role="status" aria-label="역량 분석 불러오는 중">
                      <Skeleton className="size-48 rounded-ait-pill" />
                    </div>
                  )}
                </div>
              </section>

              <section className="report-feedback-grid mt-4 grid grid-cols-2 gap-8" aria-label="종합 피드백">
                <article className="rounded-ait-s border border-status-success bg-feedback-success p-4">
                  <h3 className="flex items-center gap-3 text-body-1 font-medium">
                    <ThumbsUp className="size-8 text-status-success" aria-hidden="true" />
                    잘한 점
                  </h3>
                  {detail ? (
                    detail.content.strengths.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-6 text-body-2">
                        {detail.content.strengths.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-body-2 text-text-secondary">표시할 내용이 없습니다.</p>
                    )
                  ) : (
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  )}
                </article>
                <article className="rounded-ait-s border border-feedback-improve-border bg-feedback-improve p-4">
                  <h3 className="flex items-center gap-3 text-body-1 font-medium">
                    <TrendingUp className="size-8 text-feedback-improve-text" aria-hidden="true" />
                    개선하면 좋은 점
                  </h3>
                  {detail ? (
                    detail.content.weaknesses.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-6 text-body-2">
                        {detail.content.weaknesses.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-body-2 text-text-secondary">표시할 내용이 없습니다.</p>
                    )
                  ) : (
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  )}
                </article>
              </section>

              <section className="mt-8" aria-labelledby="question-feedback-title">
                <h3 id="question-feedback-title" className="mb-4 text-body-1 font-medium">
                  질문별 피드백
                </h3>
                <div className="space-y-4">
                  {isDetailLoading ? (
                    Array.from({ length: 2 }, (_, index) => (
                      <Skeleton key={index} className="h-14 w-full rounded-ait-s" />
                    ))
                  ) : detail && detail.questions.length ? (
                    detail.questions.map((question, index) => (
                      <ReportQuestion
                        key={question.questionId}
                        defaultOpen={index === 0}
                        title={`Q${index + 1}. ${question.question}`}
                      >
                        <div className="report-question-grid grid grid-cols-3 divide-x divide-chart-axis">
                          <div className="report-question-column pr-6">
                            <h4 className="text-body-2 font-medium">내 답변</h4>
                            <p className="mt-3 whitespace-pre-line text-body-2 leading-7 text-text-secondary">
                              {question.userAnswer}
                            </p>
                          </div>
                          <div className="report-question-column px-6">
                            <h4 className="text-body-2 font-medium">AI 예시 답변</h4>
                            <p className="mt-3 whitespace-pre-line text-body-2 leading-7 text-text-secondary">
                              {question.aiAnswer}
                            </p>
                          </div>
                          <div className="report-question-column pl-6">
                            <h4 className="text-body-2 font-medium">피드백</h4>
                            <p className="mt-3 whitespace-pre-line text-body-2 leading-7 text-text-secondary">
                              {question.feedback}
                            </p>
                          </div>
                        </div>
                      </ReportQuestion>
                    ))
                  ) : (
                    <p className="rounded-ait-s border border-border-default px-6 py-8 text-center text-body-2 text-text-secondary">
                      질문별 피드백이 없습니다.
                    </p>
                  )}
                </div>
              </section>

              <p className="mt-4 text-caption text-text-secondary">
                AI 분석 결과는 면접 연습을 위한 참고 자료입니다.
              </p>
            </>
          )}
            </div>

            <footer className="report-dialog__footer flex items-center justify-between border-t border-chart-axis bg-surface-default px-10 py-3">
              <Button type="button" variant="secondary" className="min-w-44 font-medium">
                <Play className="size-5" aria-hidden="true" />
                영상 다시보기
              </Button>
              <div className="report-dialog__actions flex items-center gap-4">
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
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

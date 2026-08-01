import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import {
  getPeerSummary,
  getReceivedPeerFeedbacksInSession,
  type PeerFeedback,
} from '@/api/peer-feedback'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnimatedNumber } from '@/components/dashboard/useAnimatedNumber'
import { StudyEvaluationRadar } from '@/components/study/StudyEvaluationRadar'
import { averageEvaluationScores, toEvaluationScores } from '@/lib/peer-evaluation'
import type { StudyRecord } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface StudySessionReportModalProps {
  open: boolean
  record: StudyRecord
  onClose: () => void
}

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface TeammateAccordionProps {
  title: string
  averageScore: number
  children: React.ReactNode
}

function TeammateAccordion({ title, averageScore, children }: TeammateAccordionProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-ait-s border border-border-default bg-surface-default">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-status-neutral-surface"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="flex items-baseline gap-3">
          <span className="text-body-1 font-medium">{title}</span>
          <span className="text-body-2 tabular-nums text-text-secondary">
            평균 {averageScore.toFixed(1)}점
          </span>
        </span>
        <span className="flex items-center gap-1 text-body-2 text-text-secondary">
          상세
          <ChevronDown
            className={cn(
              'size-5 shrink-0 transition-transform duration-250 ease-standard',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </span>
      </button>
      <div className={cn('accordion-content', expanded && 'is-open')}>
        <div className="min-h-0">
          <div className="border-t border-border-default px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

type FeedbackListState =
  | { status: 'idle' }
  | { status: 'loaded'; sessionId: number; feedbacks: PeerFeedback[] }
  | { status: 'error'; sessionId: number; message: string }

type SummaryState =
  | { status: 'idle' }
  | { status: 'loaded'; sessionId: number; content: string }
  // 아직 생성 전(404)이거나 일시적으로 조회에 실패한 경우 — 둘 다 "아직 준비되지 않음"으로 묶어 보여준다.
  | { status: 'pending'; sessionId: number }

// 스터디 세션 리포트 모달. 종합 점수·역량 레이더·AI 총평·팀원별 평가를 보여준다.
// 접근성을 위해 열려 있는 동안 포커스를 모달 안에 가두고 Esc로 닫는다(ReportModal과 동일한 패턴).
export function StudySessionReportModal({ open, record, onClose }: StudySessionReportModalProps) {
  const shouldReduceMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const animatedScore = useAnimatedNumber(record.score, open)
  const [feedbackState, setFeedbackState] = useState<FeedbackListState>({ status: 'idle' })
  const [summaryState, setSummaryState] = useState<SummaryState>({ status: 'idle' })

  useEffect(() => {
    if (!open) return
    let cancelled = false

    getReceivedPeerFeedbacksInSession(record.sessionId)
      .then((feedbacks) => {
        if (!cancelled) setFeedbackState({ status: 'loaded', sessionId: record.sessionId, feedbacks })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFeedbackState({
            status: 'error',
            sessionId: record.sessionId,
            message: error instanceof Error ? error.message : '평가를 불러오지 못했습니다.',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, record.sessionId])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    getPeerSummary(record.sessionId)
      .then((summary) => {
        if (!cancelled) setSummaryState({ status: 'loaded', sessionId: record.sessionId, content: summary.content })
      })
      .catch(() => {
        if (!cancelled) setSummaryState({ status: 'pending', sessionId: record.sessionId })
      })

    return () => {
      cancelled = true
    }
  }, [open, record.sessionId])

  // 다른 기록을 열면 이전 상세가 잠깐 보이지 않도록, 지금 record와 다른 세션의 결과는 무시한다.
  const isCurrentFeedback = feedbackState.status !== 'idle' && feedbackState.sessionId === record.sessionId
  const feedbacks = isCurrentFeedback && feedbackState.status === 'loaded' ? feedbackState.feedbacks : []
  const feedbackError = isCurrentFeedback && feedbackState.status === 'error' ? feedbackState.message : null
  const isFeedbackLoading = !isCurrentFeedback
  const radarScores = averageEvaluationScores(feedbacks)
  const isCurrentSummary = summaryState.status !== 'idle' && summaryState.sessionId === record.sessionId

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
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

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
            layoutId={shouldReduceMotion ? undefined : `study-report-${record.sessionId}`}
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
            data-report-dialog={record.sessionId}
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-report-title"
          >
            <div className="report-dialog__body min-h-0 flex-1 overflow-y-auto px-10 pb-6 pt-10">
              <header>
                <h2 id="study-report-title" className="text-h2">
                  {record.groupTitle}
                </h2>
                <p className="mt-3 flex flex-wrap items-center gap-3 text-body-2 text-text-secondary">
                  <time>{record.date}</time>
                  <span aria-hidden="true">·</span>
                  <span>스터디 상호평가</span>
                </p>
              </header>

              <section
                className="report-summary mt-6 grid grid-cols-[0.9fr_2.1fr] rounded-ait-s border border-border-default p-6"
                aria-label="세션 종합 분석"
              >
                <div className="report-score-panel flex flex-col items-center justify-start border-r border-chart-axis pr-6 text-center">
                  <h3 className="text-body-1 font-medium">종합 점수</h3>
                  <p className="mt-4 flex items-baseline gap-3 tabular-nums">
                    <strong className="text-report-score text-status-achievement">
                      {animatedScore.toFixed(1)}
                    </strong>
                    <span className="text-h2 font-normal text-text-secondary">/ 10</span>
                  </p>
                  <p className="mt-1 text-body-2 tabular-nums" aria-label="같은 그룹 직전 스터디 대비">
                    {record.delta === 0 ? (
                      <span className="text-text-secondary">0점</span>
                    ) : record.delta > 0 ? (
                      <span className="text-stat-up">▲ +{record.delta.toFixed(1)}점</span>
                    ) : (
                      <span className="text-stat-down">▼ {record.delta.toFixed(1)}점</span>
                    )}
                  </p>
                  <div className="mt-3 w-full">
                    {isFeedbackLoading ? (
                      <div className="flex justify-center" role="status" aria-label="역량 분석 불러오는 중">
                        <Skeleton className="size-32 rounded-ait-pill" />
                      </div>
                    ) : (
                      <StudyEvaluationRadar scores={radarScores} bare />
                    )}
                  </div>
                </div>
                <div className="report-radar-panel pl-6">
                  <h3 className="flex items-center gap-3 text-body-1 font-medium">
                    <Sparkles className="size-6 text-action-primary" aria-hidden="true" />
                    AI 평가 요약
                  </h3>
                  {isCurrentSummary && summaryState.status === 'loaded' ? (
                    <p className="mt-4 whitespace-pre-line text-body-2 leading-7 text-text-secondary">
                      {summaryState.content}
                    </p>
                  ) : isCurrentSummary && summaryState.status === 'pending' ? (
                    <p className="mt-4 text-body-2 text-text-secondary">
                      아직 AI 요약이 준비되지 않았습니다. 팀원들의 코멘트를 종합하는 대로 채워집니다.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  )}
                </div>
              </section>

              <p className="mt-4 text-caption text-text-secondary">
                AI 분석 결과는 스터디 참고 자료이며 합격 여부를 뜻하지 않습니다.
              </p>

              <section className="mt-8" aria-labelledby="teammate-feedback-title">
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 id="teammate-feedback-title" className="text-body-1 font-medium">
                    팀원 총평
                  </h3>
                  {!isFeedbackLoading && !feedbackError ? (
                    <span className="text-body-2 text-text-secondary">
                      {feedbacks.length}명 참여
                    </span>
                  ) : null}
                </div>
                <div className="space-y-4">
                  {isFeedbackLoading ? (
                    Array.from({ length: 2 }, (_, index) => (
                      <Skeleton key={index} className="h-14 w-full rounded-ait-s" />
                    ))
                  ) : feedbackError ? (
                    <p className="rounded-ait-s border border-border-default px-6 py-8 text-center text-body-2 text-status-error">
                      {feedbackError}
                    </p>
                  ) : feedbacks.length ? (
                    feedbacks.map((feedback, index) => {
                      const scores = toEvaluationScores(feedback)
                      return (
                        <TeammateAccordion
                          key={feedback.id}
                          title={`스터디원 ${index + 1}`}
                          averageScore={feedback.scoreAvg}
                        >
                          <div className="grid grid-cols-[0.9fr_2.1fr] gap-6">
                            <div className="flex items-center justify-center border-r border-chart-axis pr-6">
                              <StudyEvaluationRadar scores={scores} bare />
                            </div>
                            <p className="whitespace-pre-line text-body-2 leading-7 text-text-secondary">
                              {feedback.feedback || '남긴 코멘트가 없습니다.'}
                            </p>
                          </div>
                        </TeammateAccordion>
                      )
                    })
                  ) : (
                    <p className="rounded-ait-s border border-border-default px-6 py-8 text-center text-body-2 text-text-secondary">
                      아직 받은 평가가 없습니다.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <footer className="report-dialog__footer flex items-center justify-end border-t border-chart-axis bg-surface-default px-10 py-3">
              <Button
                ref={closeButtonRef}
                type="button"
                variant="secondary"
                className="min-w-32 font-medium"
                onClick={onClose}
              >
                닫기
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

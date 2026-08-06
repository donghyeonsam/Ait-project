import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ThumbsUp, TrendingUp } from 'lucide-react'
import {
  getInterviewReportDetail,
  type InterviewReportDetail,
} from '@/api/ai-interviews'
import { toErrorMessage } from '@/api/http'
import { RadarChart } from '@/components/dashboard/RadarChart'
import { TagBadge } from '@/components/dashboard/TagBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toRadarAxes } from '@/lib/radar-axes'
import { cn } from '@/lib/utils'
import type { InterviewRecord } from '@/types/dashboard'

const AUTO_ADVANCE_INTERVAL_MS = 5000
const FEEDBACK_ITEM_LIMIT = 3

interface RecentReportCarouselProps {
  records: InterviewRecord[]
}

type DetailState =
  | { status: 'loading' }
  | { status: 'loaded'; detail: InterviewReportDetail }
  | { status: 'error'; message: string }

// 대시보드 상단에서 최근 AI 면접 리포트를 레이더 분석·강점/개선점과 함께 하나씩 자동으로
// 넘겨보는 캐러셀. 마우스가 올라오거나 키보드 포커스가 들어오면 자동 전환을 멈춘다.
export function RecentReportCarousel({ records }: RecentReportCarouselProps) {
  const shouldReduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isPaused, setPaused] = useState(false)
  const [details, setDetails] = useState<Record<number, DetailState>>({})
  const requestedIdsRef = useRef<Set<number>>(new Set())
  // 마운트 시점에 다시 true로 되돌려야 한다. cleanup만 있으면 개발 모드 StrictMode가
  // 마운트→언마운트→재마운트를 시뮬레이션할 때 false로 고정돼, 응답이 와도
  // 아래 fetchDetail의 상태 갱신이 계속 무시되어 스켈레톤이 영원히 풀리지 않는다.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const record = records[index] ?? null

  const fetchDetail = useCallback((recordId: number) => {
    requestedIdsRef.current.add(recordId)
    setDetails((previous) => ({ ...previous, [recordId]: { status: 'loading' } }))

    getInterviewReportDetail(recordId)
      .then((detail) => {
        if (!mountedRef.current) return
        setDetails((previous) => ({
          ...previous,
          [recordId]: { status: 'loaded', detail },
        }))
      })
      .catch((error: unknown) => {
        if (!mountedRef.current) return
        setDetails((previous) => ({
          ...previous,
          [recordId]: { status: 'error', message: toErrorMessage(error) },
        }))
      })
  }, [])

  // 현재 보여줄 기록의 레이더·강점/개선점을 아직 조회한 적이 없으면 가져온다.
  useEffect(() => {
    if (!record || requestedIdsRef.current.has(record.id)) return
    fetchDetail(record.id)
  }, [record, fetchDetail])

  // 5초마다 다음 리포트로 넘어간다. 리포트가 1건뿐이거나, 마우스·포커스가 올라와 있거나,
  // 모션 최소화를 선호하면 자동 전환을 멈춘다.
  useEffect(() => {
    if (records.length <= 1 || isPaused || shouldReduceMotion) return
    const timer = window.setInterval(() => {
      setDirection(1)
      setIndex((current) => (current + 1) % records.length)
    }, AUTO_ADVANCE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [records.length, isPaused, shouldReduceMotion])

  if (!record) return null

  const detailState = details[record.id]
  const pause = () => setPaused(true)
  const resume = () => setPaused(false)

  return (
    <div
      className="relative"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          resume()
        }
      }}
    >
      <div>
        <h2 className="text-h2 font-semibold">최근 AI 면접 리포트</h2>
        <p className="mt-1 text-body-2 text-text-secondary">
          최근 {records.length}건의 리포트를 자동으로 넘겨보며 변화를 확인해보세요.
        </p>
      </div>

      <div className="recent-report-grid mt-6 grid gap-6" aria-live="off">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={record.id}
            custom={direction}
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, x: direction >= 0 ? 32 : -32 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: direction >= 0 ? -32 : 32 }
            }
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="px-2 py-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <time className="tabular-nums text-body-2 text-text-secondary">
                    {record.date}
                  </time>
                  <TagBadge
                    variant={record.type}
                    className="bg-surface-default ring-1 ring-border-default"
                  />
                </div>
                <h3 className="mt-2 truncate text-h3 font-semibold">{record.title}</h3>
              </div>
              <p className="mt-3 shrink-0 flex items-baseline gap-1">
                <strong className="tabular-nums text-h1 text-status-achievement">
                  {record.score.toFixed(1)}
                </strong>
                <span className="text-caption text-text-secondary">/ 10</span>
              </p>
            </div>

            <div className="mt-4">
              {detailState?.status === 'loaded' ? (
                <RadarChart axes={toRadarAxes(detailState.detail)} active />
              ) : (
                <div
                  className="flex justify-center py-4"
                  role="status"
                  aria-label="역량 분석 불러오는 중"
                >
                  <Skeleton className="size-48 rounded-ait-pill" />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={record.id}
            custom={direction}
            initial={shouldReduceMotion ? false : { opacity: 0, x: direction >= 0 ? 32 : -32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: direction >= 0 ? -32 : 32 }
            }
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-4 rounded-ait-l border border-border-default bg-background-default p-6 shadow-elevation-1"
          >
            {detailState?.status === 'error' ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <p className="text-body-2 text-text-secondary">{detailState.message}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-w-28"
                  onClick={() => fetchDetail(record.id)}
                >
                  다시 시도
                </Button>
              </div>
            ) : (
              <>
                <article className="rounded-ait-s border border-status-success bg-feedback-success p-4">
                  <h3 className="flex items-center gap-2 text-body-2 font-medium">
                    <ThumbsUp className="size-5 text-status-success" aria-hidden="true" />
                    잘한 점
                  </h3>
                  {detailState?.status === 'loaded' ? (
                    detailState.detail.content.strengths.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-caption">
                        {detailState.detail.content.strengths
                          .slice(0, FEEDBACK_ITEM_LIMIT)
                          .map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-caption text-text-secondary">표시할 내용이 없습니다.</p>
                    )
                  ) : (
                    <div className="mt-2 space-y-2">
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  )}
                </article>

                <article className="rounded-ait-s border border-feedback-improve-border bg-feedback-improve p-4">
                  <h3 className="flex items-center gap-2 text-body-2 font-medium">
                    <TrendingUp className="size-5 text-feedback-improve-text" aria-hidden="true" />
                    개선하면 좋은 점
                  </h3>
                  {detailState?.status === 'loaded' ? (
                    detailState.detail.content.weaknesses.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-caption">
                        {detailState.detail.content.weaknesses
                          .slice(0, FEEDBACK_ITEM_LIMIT)
                          .map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-caption text-text-secondary">표시할 내용이 없습니다.</p>
                    )
                  ) : (
                    <div className="mt-2 space-y-2">
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  )}
                </article>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {records.length > 1 ? (
        <div
          className="mt-6 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="리포트 선택"
        >
          {records.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={itemIndex === index}
              aria-label={`${itemIndex + 1}번째 리포트 보기`}
              className={cn(
                'h-2 rounded-ait-pill transition-all duration-150 ease-standard',
                itemIndex === index
                  ? 'w-6 bg-action-primary'
                  : 'w-2 bg-border-default hover:bg-action-primary/50',
              )}
              onClick={() => {
                setDirection(itemIndex > index ? 1 : -1)
                setIndex(itemIndex)
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  getInterviewReportDetail,
  type InterviewReportDetail,
} from '@/api/ai-interviews'
import { RadarChart } from '@/components/dashboard/RadarChart'
import { TagBadge } from '@/components/dashboard/TagBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { toRadarAxes } from '@/lib/radar-axes'
import { cn } from '@/lib/utils'
import type { InterviewRecord } from '@/types/dashboard'

const AUTO_ADVANCE_INTERVAL_MS = 5000

interface RecentReportRadarProps {
  records: InterviewRecord[]
  onOpenReport: (record: InterviewRecord) => void
}

type DetailState =
  | { status: 'loading' }
  | { status: 'loaded'; detail: InterviewReportDetail }
  | { status: 'error' }

// "최근 AI면접 기록" 패널 자리에서 최근 리포트의 역량 레이더를 하나씩 자동으로 넘겨 보여준다.
// 클릭하면 해당 기록의 전체 리포트 모달이 열린다.
export function RecentReportRadar({ records, onOpenReport }: RecentReportRadarProps) {
  const shouldReduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isPaused, setPaused] = useState(false)
  const [details, setDetails] = useState<Record<number, DetailState>>({})
  const requestedIdsRef = useRef<Set<number>>(new Set())
  // 마운트 시점에 다시 true로 되돌려야 한다. cleanup만 있으면 개발 모드 StrictMode가
  // 마운트→언마운트→재마운트를 시뮬레이션할 때 false로 고정돼, 응답이 와도 상태 갱신이 무시된다.
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
      .catch(() => {
        if (!mountedRef.current) return
        setDetails((previous) => ({ ...previous, [recordId]: { status: 'error' } }))
      })
  }, [])

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

  return (
    <div
      className="mt-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.button
          key={record.id}
          type="button"
          custom={direction}
          initial={
            shouldReduceMotion
              ? false
              : { opacity: 0, x: direction >= 0 ? 24 : -24 }
          }
          animate={{ opacity: 1, x: 0 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, x: direction >= 0 ? -24 : 24 }
          }
          transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeOut' }}
          onClick={() => onOpenReport(record)}
          aria-label={`${record.title} 리포트 보기`}
          className="w-full rounded-ait-m text-left transition-colors duration-150 hover:bg-status-neutral-surface"
        >
          <div className="min-w-0">
            <time className="tabular-nums text-caption text-text-secondary">
              {record.date}
            </time>
            <TagBadge
              variant={record.type}
              className="ml-2 bg-surface-default ring-1 ring-border-default"
            />
          </div>

          {/* 점수를 그래프 컨테이너 안에 두어 그래프 우상단에 가깝게 붙인다. */}
          <div className="relative mt-1">
            <div className="absolute -top-8 right-6 text-center">
              <p className="text-caption text-text-secondary">총점</p>
              <p className="flex items-baseline gap-0.5">
                <strong className="tabular-nums text-h2 text-status-achievement">
                  {record.score.toFixed(1)}
                </strong>
                <span className="text-body-2 text-text-secondary">/10</span>
              </p>
            </div>

            {detailState?.status === 'loaded' ? (
              <RadarChart axes={toRadarAxes(detailState.detail)} active className="mt-4" />
            ) : (
              <div
                className="mt-4 flex justify-center py-2"
                role="status"
                aria-label="역량 분석 불러오는 중"
              >
                <Skeleton className="size-40 rounded-ait-pill" />
              </div>
            )}
          </div>
        </motion.button>
      </AnimatePresence>

      {records.length > 1 ? (
        <div
          className="mt-2 flex items-center justify-center gap-2"
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
                'h-1.5 rounded-ait-pill transition-all duration-150 ease-standard',
                itemIndex === index
                  ? 'w-5 bg-action-primary'
                  : 'w-1.5 bg-border-default hover:bg-action-primary/50',
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

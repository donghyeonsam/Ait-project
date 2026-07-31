import { AlertCircle, ChevronDown, FileSearch, Flame, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getInterviewReports } from '@/api/ai-interviews'
import { toErrorMessage } from '@/api/http'
import { InterviewRecordItem } from '@/components/dashboard/InterviewRecordItem'
import { ReportModal } from '@/components/dashboard/ReportModal'
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart'
import { StatCard } from '@/components/dashboard/StatCard'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type {
  InterviewRecord,
  InterviewType,
  ScoreTrendPoint,
} from '@/types/dashboard'

interface DashboardNavState {
  newAnalyzingRecord?: InterviewRecord
}

const interviewTypes: Array<'전체' | InterviewType> = [
  '전체',
  '종합',
  '직무',
  '기술',
  '포폴',
  'CS',
]

const RECORD_PAGE_SIZE = 4
const TREND_POINT_COUNT = 7
const DAY_MS = 24 * 60 * 60 * 1000

// 'YYYY. MM. DD' 형식의 기록 날짜를 Date로 되돌린다.
const parseRecordDate = (date: string) => new Date(date.replace(/\. /g, '-'))

// 해당 날짜가 속한 주의 월요일 00시를 구한다.
const startOfWeek = (date: Date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}

// 대시보드의 AI 모의면접 기록 화면. 리포트 목록을 불러와 요약 지표·점수 추이·기록 리스트를 보여준다.
export function DashboardInterviewsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [records, setRecords] = useState<InterviewRecord[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'loaded'>(
    'loading',
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [activeType, setActiveType] = useState<'전체' | InterviewType>('전체')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [visibleRecordCount, setVisibleRecordCount] = useState(RECORD_PAGE_SIZE)
  const [selectedRecord, setSelectedRecord] = useState<InterviewRecord | null>(
    null,
  )
  const [reportOpen, setReportOpen] = useState(false)
  const [requestKey, setRequestKey] = useState(0)
  const consumedNavState = useRef(false)

  useEffect(() => {
    let cancelled = false

    getInterviewReports()
      .then((result) => {
        if (cancelled) return
        // 방금 종료한 분석 중 기록은 목록 응답에 아직 없으므로 화면 상태에 그대로 유지한다.
        setRecords((previous) => {
          const analyzing = previous.filter(
            (record) =>
              record.status === 'analyzing' &&
              !result.some((item) => item.id === record.id),
          )
          return [...analyzing, ...result]
        })
        setLoadState('loaded')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setErrorMessage(toErrorMessage(error))
        setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [requestKey])

  // 면접 세션에서 넘어온 분석 중 기록을 목록 맨 위에 끼워 넣는다.
  // TODO: 실제 API 연동 필요 - 분석 완료 폴링으로 완료 상태 전환
  useEffect(() => {
    const incoming = (location.state as DashboardNavState | null)
      ?.newAnalyzingRecord
    if (!incoming || consumedNavState.current) {
      return
    }
    consumedNavState.current = true

    setRecords((previous) => [
      incoming,
      ...previous.filter((record) => record.id !== incoming.id),
    ])
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  // 요약 지표. 이번 주(월요일 시작) 횟수와 하루 단위 연속 연습 일수를 기록 날짜로 계산한다.
  const stats = useMemo(() => {
    const dayTimes = [
      ...new Set(
        records.map((record) => {
          const day = parseRecordDate(record.date)
          day.setHours(0, 0, 0, 0)
          return day.getTime()
        }),
      ),
    ].sort((a, b) => a - b)

    const weekStart = startOfWeek(new Date()).getTime()
    const previousWeekStart = weekStart - 7 * DAY_MS
    const dates = records.map((record) => parseRecordDate(record.date).getTime())
    const thisWeek = dates.filter((time) => time >= weekStart).length
    const lastWeek = dates.filter(
      (time) => time >= previousWeekStart && time < weekStart,
    ).length

    let bestStreak = 0
    let run = 0
    let previousDay: number | null = null
    for (const day of dayTimes) {
      run = previousDay !== null && day - previousDay === DAY_MS ? run + 1 : 1
      bestStreak = Math.max(bestStreak, run)
      previousDay = day
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastDay = dayTimes.at(-1)
    // 마지막 연습이 오늘이나 어제면 연속이 이어지는 중으로 본다.
    const currentStreak =
      lastDay !== undefined && today.getTime() - lastDay <= DAY_MS ? run : 0

    return { thisWeek, weekDiff: thisWeek - lastWeek, currentStreak, bestStreak }
  }, [records])

  const trendData = useMemo<ScoreTrendPoint[]>(() => {
    return records
      .filter((record) => record.status !== 'analyzing')
      .slice(0, TREND_POINT_COUNT)
      .reverse()
      .map((record) => ({ date: record.date.slice(6), score: record.score }))
  }, [records])

  const filteredRecords = useMemo(() => {
    const analyzing = records.filter((record) => record.status === 'analyzing')
    const completed = records.filter(
      (record) =>
        record.status !== 'analyzing' &&
        (activeType === '전체' || record.type === activeType),
    )
    const sortedCompleted =
      sortOrder === 'latest' ? completed : [...completed].reverse()
    return [...analyzing, ...sortedCompleted]
  }, [records, activeType, sortOrder])

  const visibleRecords = filteredRecords.slice(0, visibleRecordCount)
  const hasMoreRecords = visibleRecordCount < filteredRecords.length

  const openReport = useCallback((record: InterviewRecord) => {
    setSelectedRecord(record)
    setReportOpen(true)
  }, [])

  const closeReport = useCallback(() => setReportOpen(false), [])

  const isEmpty = loadState === 'loaded' && records.length === 0

  return (
    <PageLayout contentClassName="max-w-interviews">
      <section className="pb-8 pt-12" aria-labelledby="page-title">
        <h1 id="page-title" className="text-h1">AI 모의면접</h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          실전처럼 연습하고, 면접 역량의 변화를 확인해보세요.
        </p>
      </section>

      {loadState === 'error' ? (
        <section
          className="dashboard-panel mb-24 flex min-h-96 flex-col items-center justify-center text-center"
          aria-labelledby="records-error-title"
        >
          <span className="flex size-16 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-status-error" aria-hidden="true">
            <AlertCircle className="size-8" />
          </span>
          <h2 id="records-error-title" className="mt-5 text-h2">면접 기록을 불러오지 못했습니다</h2>
          <p className="mt-2 text-body-2 text-text-secondary">{errorMessage}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-6 min-w-32"
            onClick={() => {
              setLoadState('loading')
              setRequestKey((key) => key + 1)
            }}
          >
            다시 시도
          </Button>
        </section>
      ) : isEmpty ? (
        <section
          className="dashboard-panel mb-24 flex min-h-96 flex-col items-center justify-center text-center"
          aria-labelledby="records-title"
        >
          <span className="flex size-16 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary" aria-hidden="true">
            <FileSearch className="size-8" />
          </span>
          <h2 id="records-title" className="mt-5 text-h2">저장된 면접 기록이 없습니다</h2>
          <p className="mt-2 text-body-2 text-text-secondary">
            AI 모의면접을 완료하면 분석 결과와 점수 추이를 확인할 수 있습니다.
          </p>
        </section>
      ) : (
        <>
          <section className="interview-summary-grid grid gap-10" aria-label="모의면접 활동 요약">
            <div>
              <StatCard
                compact
                index={0}
                icon={<UsersRound className="size-7" />}
                label="이번 주 모의면접"
                value={stats.thisWeek}
                unit="회"
                deltaLabel={`${Math.abs(stats.weekDiff)}회`}
                deltaDirection={stats.weekDiff >= 0 ? 'up' : 'down'}
              />
              <div className="my-6 border-t border-border-default" />
              <StatCard
                compact
                index={1}
                icon={<Flame className="size-7" />}
                label="연속 연습"
                value={stats.currentStreak}
                unit="일"
                footerLabel="최고 기록"
                deltaLabel={`${stats.bestStreak}일`}
              />
            </div>
            <section className="dashboard-panel interview-chart-panel" aria-labelledby="score-chart-title">
              <h2 id="score-chart-title" className="text-h3 font-semibold">종합 점수 추이</h2>
              <ScoreTrendChart filled data={trendData} className="mt-1" />
            </section>
          </section>

          <section className="mt-10 border-t border-chart-axis pb-24 pt-4" aria-labelledby="records-title">
            <h2 id="records-title" className="text-h2">AI 면접기록</h2>

            <div className="mt-4 flex items-center justify-between gap-6 border-b border-chart-axis pb-4">
              <div className="flex items-center gap-6">
                <span className="shrink-0 text-body-1">면접 유형</span>
                <div className="flex flex-wrap items-center gap-4" role="radiogroup" aria-label="면접 유형">
                  {interviewTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={activeType === type}
                      className={cn(
                        'min-w-16 rounded-ait-s border px-4 py-1 text-body-2 transition-colors duration-150',
                        activeType === type
                          ? 'border-action-primary bg-action-primary font-medium text-surface-default'
                          : 'border-border-default bg-status-neutral-surface text-text-secondary hover:border-action-primary hover:text-action-primary',
                      )}
                      onClick={() => {
                        setActiveType(type)
                        setVisibleRecordCount(RECORD_PAGE_SIZE)
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="sort-order" className="sr-only">정렬 순서</label>
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value as 'latest' | 'oldest')
                    setVisibleRecordCount(RECORD_PAGE_SIZE)
                  }}
                  className="min-w-28 rounded-ait-s border border-chart-axis bg-surface-default px-4 py-2 text-body-2"
                >
                  <option value="latest">최신순</option>
                  <option value="oldest">오래된순</option>
                </select>
              </div>
            </div>

            <div
              id="interview-record-list"
              key={`${activeType}-${sortOrder}`}
              className="mt-8 space-y-4"
              aria-live="polite"
            >
              {loadState === 'loading' ? (
                Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex min-h-28 items-center gap-6 rounded-ait-m border border-border-default bg-surface-default px-8 py-4">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-3 h-6 w-64" />
                    </div>
                    <Skeleton className="h-10 w-28" />
                  </div>
                ))
              ) : filteredRecords.length ? (
                visibleRecords.map((record, index) => (
                  <InterviewRecordItem
                    key={record.id}
                    record={record}
                    index={index % RECORD_PAGE_SIZE}
                    onOpenReport={openReport}
                  />
                ))
              ) : (
                <div className="rounded-ait-m border border-border-default bg-surface-default px-8 py-10 text-center">
                  <h3 className="text-h3">조건에 맞는 면접 기록이 없습니다</h3>
                  <p className="mt-2 text-body-2 text-text-secondary">다른 면접 유형을 선택해 주세요.</p>
                </div>
              )}
            </div>
            {hasMoreRecords ? (
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-w-44"
                  aria-controls="interview-record-list"
                  onClick={() =>
                    setVisibleRecordCount((count) =>
                      Math.min(count + RECORD_PAGE_SIZE, filteredRecords.length),
                    )
                  }
                >
                  SHOW MORE
                  <ChevronDown className="size-5" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </section>
        </>
      )}

      {selectedRecord ? (
        <ReportModal
          open={reportOpen}
          record={selectedRecord}
          onClose={closeReport}
        />
      ) : null}
    </PageLayout>
  )
}

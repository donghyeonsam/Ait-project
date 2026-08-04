import {
  AlertCircle,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardList,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardSummary, type DashboardSummary } from '@/api/dashboard'
import { toErrorMessage } from '@/api/http'
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/useAuth'
import { cn } from '@/lib/utils'
import type { ScoreTrendPoint } from '@/types/dashboard'

const TREND_POINT_COUNT = 7
const RECENT_RECORD_COUNT = 3
const UPCOMING_CALENDAR_COUNT = 4

// 서버 생성 시각을 'YYYY. MM. DD' 형식으로 표시한다.
function formatDate(iso: string) {
  const date = new Date(iso)
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`
}

// 일정 시작 시각을 'MM. DD (요일) HH:mm' 형식으로 표시한다.
function formatCalendarTime(iso: string) {
  const date = new Date(iso)
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' })
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${mm}. ${dd} (${weekday}) ${hh}:${mi}`
}

interface DashboardPanelProps {
  title: string
  /** 전체 목록 화면 경로. 있으면 헤더 오른쪽에 이동 링크를 붙인다. */
  to?: string
  className?: string
  children: ReactNode
}

function DashboardPanel({ title, to, className, children }: DashboardPanelProps) {
  return (
    <section className={cn('dashboard-panel min-h-64', className)} aria-label={title}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h3 font-semibold">{title}</h2>
        {to ? (
          <Link
            to={to}
            className="flex shrink-0 items-center gap-1 text-caption font-medium text-action-primary hover:underline"
          >
            전체 보기
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function PanelEmpty({ description }: { description: string }) {
  return (
    <div className="mt-4 flex min-h-48 items-center justify-center rounded-ait-m border border-dashed border-border-default bg-surface-default px-8 text-center">
      <p className="text-body-2 text-text-secondary">{description}</p>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="mt-4 space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  )
}

// 로그인 후 첫 화면. 대시보드 요약 API 하나로 지표·면접 기록·스터디 기록·일정을 채운다.
export function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'loaded'>(
    'loading',
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [requestKey, setRequestKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    getDashboardSummary()
      .then((result) => {
        if (cancelled) return
        setSummary(result)
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

  const completedRecords = useMemo(
    () =>
      (summary?.interviewRecords ?? []).filter(
        (record) => record.status !== 'analyzing',
      ),
    [summary],
  )

  const trendData = useMemo<ScoreTrendPoint[]>(
    () =>
      completedRecords
        .slice(0, TREND_POINT_COUNT)
        .reverse()
        .map((record) => ({ date: record.date.slice(6), score: record.score })),
    [completedRecords],
  )

  // 지난 일정은 감추고 오늘 이후 일정만 가까운 순으로 보여준다.
  const upcomingCalendars = useMemo(() => {
    if (!summary) return []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    return summary.studyCalendars
      .filter((item) => new Date(item.startTime).getTime() >= todayStart.getTime())
      .slice(0, UPCOMING_CALENDAR_COUNT)
  }, [summary])

  const metrics = [
    {
      label: '이번 주 모의면접',
      unit: '회',
      icon: UsersRound,
      value: summary ? String(summary.interviewCount) : null,
      caption: '최근 7일 동안 완료한 면접',
    },
    {
      label: '최근 모의면접 종합점수',
      unit: '점',
      icon: ChartNoAxesCombined,
      value:
        summary === null
          ? null
          : summary.interviewScore === null
            ? '—'
            : summary.interviewScore.toFixed(1),
      caption:
        summary && summary.interviewScore === null
          ? '완료된 면접이 없습니다.'
          : '가장 최근 면접 기준',
    },
    {
      label: '누적 스터디 횟수',
      unit: '회',
      icon: ClipboardList,
      value: summary ? String(summary.studyCount) : null,
      caption: '평가를 받은 스터디 세션 기준',
    },
  ]

  return (
    <PageLayout contentClassName="max-w-dashboard">
      {/* 헤더·푸터를 제외한 대시보드 본문 전체를 90% 크기로 축소해 표시한다. */}
      <div className="zoom-[0.9]">
        <section
          className="study-reveal is-visible pb-10 pt-10"
          style={{ '--reveal-order': 0 } as React.CSSProperties}
          aria-labelledby="page-title"
        >
          <h1 id="page-title" className="text-h1">
            좋은 아침이에요, {user?.nickname ?? '사용자'}님
          </h1>
          <p className="mt-2 text-body-2 text-text-secondary">
            오늘도 Ait과 함께 면접 역량을 한 단계 성장시켜보세요.
          </p>
        </section>

        {loadState === 'error' ? (
          <section
            className="dashboard-panel mb-24 flex min-h-96 flex-col items-center justify-center text-center"
            aria-labelledby="dashboard-error-title"
          >
            <span className="flex size-16 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-status-error" aria-hidden="true">
              <AlertCircle className="size-8" />
            </span>
            <h2 id="dashboard-error-title" className="mt-5 text-h2">대시보드 정보를 불러오지 못했습니다</h2>
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
        ) : (
          <>
            <section
              className="study-reveal is-visible dashboard-stats grid grid-cols-3 gap-4"
              style={{ '--reveal-order': 1 } as React.CSSProperties}
              aria-label="활동 요약"
            >
              {metrics.map(({ label, unit, icon: Icon, value, caption }) => (
                <article key={label} className="rounded-ait-m border border-border-default bg-background-default p-6 shadow-elevation-1">
                  <div className="flex items-center gap-4">
                    <span className="flex size-14 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary" aria-hidden="true">
                      <Icon className="size-8" />
                    </span>
                    <div>
                      <p className="text-body-2 text-text-secondary">{label}</p>
                      {value === null ? (
                        <Skeleton className="mt-2 h-8 w-16" />
                      ) : (
                        <p className="mt-1 flex items-baseline gap-1">
                          <strong className="tabular-nums text-h2">{value}</strong>
                          <span className="text-caption">{unit}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-caption text-text-secondary">{caption}</p>
                </article>
              ))}
            </section>

            <div className="my-8 border-t border-border-default" />

            <div
              className="study-reveal is-visible dashboard-main-grid grid gap-10"
              style={{ '--reveal-order': 2 } as React.CSSProperties}
            >
              <DashboardPanel title="최근 AI면접 기록" to="/dashboard/interviews">
                {loadState === 'loading' ? (
                  <PanelSkeleton />
                ) : completedRecords.length ? (
                  <ul className="mt-2 divide-y divide-border-default">
                    {completedRecords.slice(0, RECENT_RECORD_COUNT).map((record) => (
                      <li key={record.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-body-2 font-medium">{record.title}</p>
                          <p className="mt-1 tabular-nums text-caption text-text-secondary">{record.date}</p>
                        </div>
                        <p className="shrink-0">
                          <strong className="tabular-nums text-h3">{record.score.toFixed(1)}</strong>
                          <span className="ml-1 text-caption text-text-secondary">점</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <PanelEmpty description="저장된 면접 기록이 없습니다." />
                )}
              </DashboardPanel>

              <DashboardPanel title="종합 점수 추이" className="dashboard-chart-panel">
                {loadState === 'loading' ? (
                  <PanelSkeleton />
                ) : trendData.length ? (
                  <ScoreTrendChart filled data={trendData} className="mt-1" />
                ) : (
                  <PanelEmpty description="면접 분석 데이터가 연결되면 점수 추이가 표시됩니다." />
                )}
              </DashboardPanel>
            </div>

            <div className="my-10 border-t border-border-default" />

            <div
              className="study-reveal is-visible dashboard-main-grid grid gap-10 pb-20"
              style={{ '--reveal-order': 2 } as React.CSSProperties}
            >
              <DashboardPanel title="최근 스터디 기록" to="/dashboard/study">
                {loadState === 'loading' ? (
                  <PanelSkeleton />
                ) : summary?.studyFeedbacks.length ? (
                  <ul className="mt-2 divide-y divide-border-default">
                    {summary.studyFeedbacks.slice(0, RECENT_RECORD_COUNT).map((feedback) => (
                      <li key={feedback.sessionId} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-body-2 font-medium">{feedback.sessionTitle}</p>
                          <p className="mt-1 tabular-nums text-caption text-text-secondary">{formatDate(feedback.createdAt)}</p>
                        </div>
                        <p className="shrink-0">
                          <strong className="tabular-nums text-h3">{feedback.scoreAvg.toFixed(1)}</strong>
                          <span className="ml-1 text-caption text-text-secondary">점</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <PanelEmpty description="저장된 스터디 기록이 없습니다." />
                )}
              </DashboardPanel>

              <DashboardPanel title="나의 스터디 일정">
                {loadState === 'loading' ? (
                  <PanelSkeleton />
                ) : upcomingCalendars.length ? (
                  <ul className="mt-4 space-y-3">
                    {upcomingCalendars.map((item) => (
                      <li
                        key={item.calendarId}
                        className="flex items-center gap-4 rounded-ait-m border border-border-default bg-surface-default px-4 py-3"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary" aria-hidden="true">
                          <CalendarDays className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-2 font-medium">{item.content}</p>
                          <p className="mt-1 truncate text-caption text-text-secondary">{item.groupTitle}</p>
                        </div>
                        <time className="shrink-0 tabular-nums text-caption text-text-secondary" dateTime={item.startTime}>
                          {formatCalendarTime(item.startTime)}
                        </time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <PanelEmpty description="등록된 스터디 일정이 없습니다." />
                )}
              </DashboardPanel>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}

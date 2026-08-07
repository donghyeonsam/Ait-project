import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { hideInterviewReport } from '@/api/ai-interviews'
import { getDashboardSummary, type DashboardSummary } from '@/api/dashboard'
import { toErrorMessage } from '@/api/http'
import { toStudyRecords } from '@/api/peer-feedback'
import { DashboardStudyCalendar } from '@/components/dashboard/DashboardStudyCalendar'
import { InterviewPowerPanel } from '@/components/dashboard/InterviewPowerPanel'
import { RecentReportRadar } from '@/components/dashboard/RecentReportRadar'
import { RecentStudyRadar } from '@/components/dashboard/RecentStudyRadar'
import { ReportModal } from '@/components/dashboard/ReportModal'
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart'
import { StudySessionReportModal } from '@/components/dashboard/StudySessionReportModal'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/useAuth'
import { cn } from '@/lib/utils'
import type { InterviewRecord, ScoreTrendPoint, StudyRecord } from '@/types/dashboard'

const TREND_POINT_COUNT = 7
const RECENT_RECORD_COUNT = 3
const UPCOMING_CALENDAR_COUNT = 4

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
  const [selectedRecord, setSelectedRecord] = useState<InterviewRecord | null>(
    null,
  )
  const [reportOpen, setReportOpen] = useState(false)
  const reportOpenRef = useRef(reportOpen)
  useEffect(() => {
    reportOpenRef.current = reportOpen
  }, [reportOpen])
  const [selectedStudyRecord, setSelectedStudyRecord] = useState<StudyRecord | null>(
    null,
  )
  const [studyReportOpen, setStudyReportOpen] = useState(false)

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

  const recentInterviewRecords = useMemo(
    () => completedRecords.slice(0, RECENT_RECORD_COUNT),
    [completedRecords],
  )

  const recentStudyRecords = useMemo(
    () => toStudyRecords(summary?.studyFeedbacks ?? []).slice(0, RECENT_RECORD_COUNT),
    [summary],
  )

  const openStudyReport = useCallback((record: StudyRecord) => {
    setSelectedStudyRecord(record)
    setStudyReportOpen(true)
  }, [])

  const closeStudyReport = useCallback(() => setStudyReportOpen(false), [])

  const openReport = useCallback((record: InterviewRecord) => {
    setSelectedRecord(record)
    setReportOpen(true)
  }, [])

  const closeReport = useCallback(() => setReportOpen(false), [])

  // 모달의 닫힘 애니메이션이 끝난 뒤에만 선택된 기록을 비운다. 애니메이션 도중 다시 열리면
  // (reportOpen이 다시 true면) 방금 연 기록이 지워지지 않도록 건너뛴다.
  const handleReportExited = useCallback(() => {
    if (!reportOpenRef.current) setSelectedRecord(null)
  }, [])

  // 리포트를 불러오지 못하는 등 목록에서 감추고 싶은 기록을 저장하고 화면에서 바로 제거한다.
  const hideRecord = useCallback((id: number) => {
    hideInterviewReport(id)
    setSummary((previous) =>
      previous
        ? {
            ...previous,
            interviewRecords: previous.interviewRecords.filter(
              (record) => record.id !== id,
            ),
          }
        : previous,
    )
    setReportOpen(false)
  }, [])

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

  // 가장 가까운 일정까지 남은 일수. 오늘 시작하는 일정이면 0이다.
  const nextStudyDday = useMemo(() => {
    const next = upcomingCalendars[0]
    if (!next) return null
    const start = new Date(next.startTime)
    start.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.round((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  }, [upcomingCalendars])

  const metrics = [
    {
      label: '이번 주 모의면접',
      unit: '회',
      icon: UsersRound,
      value: summary ? String(summary.interviewCount) : null,
      caption: '최근 7일 동안 완료한 면접',
    },
    {
      label: '누적 스터디 횟수',
      unit: '회',
      icon: ClipboardList,
      value: summary ? String(summary.studyCount) : null,
      caption: '평가를 받은 스터디 세션 기준',
    },
    {
      label: '다음 스터디 일정',
      unit: '',
      icon: CalendarDays,
      value:
        summary === null
          ? null
          : nextStudyDday === null
            ? '—'
            : nextStudyDday === 0
              ? 'D-Day'
              : `D-${nextStudyDday}`,
      caption: upcomingCalendars[0]
        ? `${formatCalendarTime(upcomingCalendars[0].startTime)} · ${upcomingCalendars[0].groupTitle}`
        : '등록된 일정이 없습니다.',
    },
  ]

  return (
    <PageLayout contentClassName="max-w-dashboard">
      <div className="page-content-zoom-90">
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
              className="study-reveal is-visible dashboard-stats flex gap-4"
              style={{ '--reveal-order': 1 } as React.CSSProperties}
              aria-label="활동 요약"
            >
              <div className="min-w-0 flex-1">
                <InterviewPowerPanel />
              </div>
              <div className="flex w-72 shrink-0 flex-col gap-4">
                {metrics.map(({ label, unit, icon: Icon, value, caption }) => (
                  <article key={label} className="rounded-ait-m border border-border-default bg-background-default p-4 shadow-elevation-1">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary" aria-hidden="true">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-caption text-text-secondary">{label}</p>
                        {value === null ? (
                          <Skeleton className="mt-1 h-6 w-14" />
                        ) : (
                          <p className="flex items-baseline gap-1">
                            <strong className="tabular-nums text-body-1 font-semibold">{value}</strong>
                            {unit ? <span className="text-caption">{unit}</span> : null}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 truncate text-caption text-text-secondary">{caption}</p>
                  </article>
                ))}
              </div>
            </section>

            <div className="my-8 border-t border-border-default" />

            <div
              className="study-reveal is-visible dashboard-main-grid grid gap-10"
              style={{ '--reveal-order': 2 } as React.CSSProperties}
            >
              <DashboardPanel title="최근 AI면접 기록" to="/dashboard/interviews">
                {loadState === 'loading' ? (
                  <PanelSkeleton />
                ) : recentInterviewRecords.length ? (
                  <RecentReportRadar
                    records={recentInterviewRecords}
                    onOpenReport={openReport}
                  />
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
              className="study-reveal is-visible dashboard-main-grid grid items-start gap-10 pb-20"
              style={{ '--reveal-order': 2 } as React.CSSProperties}
            >
              <DashboardPanel title="최근 스터디 기록" to="/dashboard/study">
                {loadState === 'loading' ? (
                  <PanelSkeleton />
                ) : recentStudyRecords.length ? (
                  <RecentStudyRadar
                    records={recentStudyRecords}
                    onOpenReport={openStudyReport}
                  />
                ) : (
                  <PanelEmpty description="저장된 스터디 기록이 없습니다." />
                )}
              </DashboardPanel>

              <DashboardPanel title="나의 스터디 일정">
                {loadState === 'loading' ? (
                  <PanelSkeleton />
                ) : summary?.studyCalendars.length ? (
                  <DashboardStudyCalendar items={summary.studyCalendars} />
                ) : (
                  <PanelEmpty description="등록된 스터디 일정이 없습니다." />
                )}
              </DashboardPanel>
            </div>
          </>
        )}
      </div>

      {selectedRecord ? (
        <ReportModal
          open={reportOpen}
          record={selectedRecord}
          onClose={closeReport}
          onExited={handleReportExited}
          onHide={() => hideRecord(selectedRecord.id)}
        />
      ) : null}

      {selectedStudyRecord ? (
        <StudySessionReportModal
          open={studyReportOpen}
          record={selectedStudyRecord}
          onClose={closeStudyReport}
        />
      ) : null}
    </PageLayout>
  )
}

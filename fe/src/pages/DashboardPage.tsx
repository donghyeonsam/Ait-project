import { Flag, Laptop, Network, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart'
import { StatCard } from '@/components/dashboard/StatCard'
import { TagBadge } from '@/components/dashboard/TagBadge'
import {
  calendarStudySchedules,
  interviewRecords,
  studyRecords,
  upcomingStudies,
} from '@/mocks/dashboard'

const calendarRows = [
  [28, 29, 30, 1, 2, 3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25],
  [26, 27, 28, 29, 30, 31, 1],
]

function DashboardPanel({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`dashboard-panel ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h3 font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function RecentInterviews() {
  return (
    <DashboardPanel
      title="최근 AI면접 기록"
      action={
        <Link
          to="/dashboard/interviews"
          className="rounded-ait-s px-2 py-1 text-caption text-text-secondary transition-colors hover:text-action-primary"
        >
          전체 보기 <span aria-hidden="true">&gt;</span>
        </Link>
      }
    >
      <ol className="mt-6 divide-y divide-border-default">
        {interviewRecords.slice(0, 3).map((record, index) => (
          <li
            key={record.id}
            className="recent-list-item flex items-center gap-6 py-3 first:pt-0 last:pb-0"
            style={{ '--record-delay': `${index * 70}ms` } as React.CSSProperties}
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-ait-pill border border-border-default bg-surface-default">
              <strong className="tabular-nums text-h3 text-text-secondary">
                {record.score.toFixed(1)}
              </strong>
            </div>
            <div className="min-w-0">
              <time className="tabular-nums text-body-1 font-semibold">
                {record.date}
              </time>
              <div className="mt-2 flex items-center gap-2">
                <TagBadge variant={record.type} />
                <TagBadge variant={record.difficulty} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </DashboardPanel>
  )
}

function RecentStudies() {
  return (
    <DashboardPanel
      title="최근 스터디 기록"
      action={
        <Link
          to="/dashboard/study"
          className="rounded-ait-s px-2 py-1 text-caption text-text-secondary transition-colors hover:text-action-primary"
        >
          전체 보기 <span aria-hidden="true">&gt;</span>
        </Link>
      }
    >
      <ol className="mt-6 divide-y divide-border-default">
        {studyRecords.map((study, index) => (
          <li
            key={study.name}
            className="recent-list-item flex items-center gap-4 py-3 first:pt-0 last:pb-0"
            style={{ '--record-delay': `${index * 70}ms` } as React.CSSProperties}
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-ait-pill border border-border-default bg-surface-default">
              <img src={study.logo} alt="" className="size-10 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-2 font-semibold">{study.name}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <TagBadge variant={study.field} />
                <time className="tabular-nums text-caption text-text-secondary">
                  {study.date}
                </time>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </DashboardPanel>
  )
}

function StudyCalendar() {
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <DashboardPanel title="나의 스터디 일정">
      <div className="mt-6 grid grid-cols-[11.5rem_1fr] gap-6">
        <section className="rounded-ait-s border border-border-default bg-surface-default p-5" aria-labelledby="upcoming-title">
          <h3 id="upcoming-title" className="text-body-1 font-semibold">다가오는 일정</h3>
          <ol className="mt-6 divide-y divide-border-default">
            {upcomingStudies.map((study) => (
              <li key={study.name} className="py-6 first:pt-0 last:pb-0">
                <p className="text-body-2 font-semibold">{study.name}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="rounded-ait-s bg-tag-fe-surface px-3 py-1 text-caption text-tag-fe">
                    {study.remaining}
                  </span>
                  <time className="tabular-nums text-caption text-text-secondary">
                    {study.date}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-ait-s border border-border-default bg-surface-default p-5" aria-label="2026년 7월 달력">
          <div className="grid grid-cols-[4rem_1fr] gap-5">
            <h3 className="pt-2 text-h2">7월</h3>
            <table className="w-full table-fixed text-center text-body-2">
              <caption className="sr-only">2026년 7월 스터디 일정</caption>
              <thead>
                <tr>
                  {weekdays.map((day, index) => (
                    <th
                      key={`${day}-${index}`}
                      scope="col"
                      className={`h-8 font-semibold ${index === 0 ? 'text-calendar-sunday' : index === 6 ? 'text-calendar-saturday' : ''}`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarRows.map((week, rowIndex) => (
                  <tr key={rowIndex}>
                    {week.map((day, columnIndex) => {
                      const muted = (rowIndex === 0 && columnIndex < 3) || (rowIndex === 4 && columnIndex === 6)
                      const today = day === 17 && rowIndex === 2
                      const schedules = muted ? undefined : calendarStudySchedules[day]
                      const tooltipId = `calendar-schedule-${rowIndex}-${columnIndex}`

                      return (
                        <td key={`${rowIndex}-${columnIndex}`} className="relative h-9">
                          {schedules ? (
                            <button
                              type="button"
                              className="group relative inline-flex h-9 min-w-7 items-center justify-center rounded-ait-s"
                              aria-label={`${day}일 스터디 일정`}
                              aria-describedby={tooltipId}
                            >
                              <span
                                className={`inline-flex size-7 items-center justify-center rounded-ait-pill ${today ? 'bg-calendar-today text-surface-default' : ''}`}
                                aria-current={today ? 'date' : undefined}
                              >
                                {day}
                              </span>
                              <span
                                className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-ait-pill bg-calendar-dot"
                                aria-hidden="true"
                              />
                              <span
                                id={tooltipId}
                                role="tooltip"
                                className={`pointer-events-none absolute bottom-full z-[var(--z-index-dropdown)] mb-2 w-max max-w-48 rounded-ait-s bg-action-primary px-3 py-2 text-left text-caption text-surface-default opacity-0 shadow-elevation-2 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 ${columnIndex === 0 ? 'left-0' : columnIndex === 6 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
                              >
                                {schedules.map((schedule) => (
                                  <span key={schedule} className="block whitespace-nowrap">
                                    {schedule}
                                  </span>
                                ))}
                              </span>
                            </button>
                          ) : (
                            <span
                              className={`inline-flex size-7 items-center justify-center rounded-ait-pill ${today ? 'bg-calendar-today text-surface-default' : muted ? 'text-calendar-muted' : ''}`}
                              aria-current={today ? 'date' : undefined}
                            >
                              {day}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardPanel>
  )
}

export function DashboardPage() {
  return (
    <PageLayout contentClassName="max-w-dashboard">
      <section className="pb-10 pt-10" aria-labelledby="page-title">
        <h1 id="page-title" className="text-h1">좋은 아침이에요, OO님</h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          오늘도 Ait과 함께 면접 역량을 한 단계 성장시켜보세요.
        </p>
      </section>

      <section className="dashboard-stats grid grid-cols-4 gap-4" aria-label="이번 주 활동 요약">
        <StatCard
          index={0}
          icon={<UsersRound className="size-8" />}
          label="이번 주 모의면접"
          value={4}
          unit="회"
          deltaLabel="1회"
        />
        <StatCard
          index={1}
          icon={<Network className="size-8" />}
          label="최근 모의면접 종합점수"
          value={8.7}
          unit="점"
          deltaLabel="1.2점"
        />
        <StatCard
          index={2}
          icon={<Laptop className="size-8" />}
          label="누적 스터디 횟수"
          value={18}
          unit="회"
          deltaLabel="4회"
        />
        <StatCard
          index={3}
          icon={<Flag className="size-8" />}
          label="목표 달성률"
          value={78}
          unit="%"
          deltaLabel="8%"
        />
      </section>

      <div className="my-8 border-t border-border-default" />

      <div className="dashboard-main-grid grid gap-10">
        <RecentInterviews />
        <DashboardPanel title="종합 점수 추이" className="dashboard-chart-panel">
          <ScoreTrendChart className="mt-3" />
        </DashboardPanel>
      </div>

      <div className="my-10 border-t border-border-default" />

      <div className="dashboard-main-grid grid gap-10 pb-20">
        <RecentStudies />
        <StudyCalendar />
      </div>
    </PageLayout>
  )
}

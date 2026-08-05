import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DashboardStudyCalendarItem } from '@/api/dashboard'
import { cn } from '@/lib/utils'

interface DashboardStudyCalendarProps {
  items: DashboardStudyCalendarItem[]
}

interface CalendarDayEntry {
  calendarId: number
  groupId: number
  groupTitle: string
  content: string
  time: string
}

interface CalendarDay {
  date: string
  entries: CalendarDayEntry[]
}

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// 서버의 LocalDateTime은 시간대 표기가 없어, Date로 바꾸지 않고 문자열에서 날짜와 시각을 잘라 쓴다.
function toDayKeyAndTime(startTime: string) {
  return { dateKey: startTime.slice(0, 10), time: startTime.slice(11, 16) }
}

function groupByDate(items: DashboardStudyCalendarItem[]) {
  const daysByDate = new Map<string, CalendarDay>()

  for (const item of items) {
    const { dateKey, time } = toDayKeyAndTime(item.startTime)
    const entry: CalendarDayEntry = {
      calendarId: item.calendarId,
      groupId: item.groupId,
      groupTitle: item.groupTitle,
      content: item.content,
      time,
    }
    const day = daysByDate.get(dateKey)

    if (day) {
      day.entries.push(entry)
      continue
    }
    daysByDate.set(dateKey, { date: dateKey, entries: [entry] })
  }

  return [...daysByDate.values()]
}

// 그룹 페이지 스터디 캘린더와 같은 월력 UI로 보여주되, 대시보드 요약이 이번 달~다음 달 일정만
// 한 번에 내려주므로 달 이동도 그 범위로 제한하고, 날짜에 마우스를 올리면(포커스 포함)
// 진행 내용을 툴팁으로 보여주는 조회 전용 컴포넌트다.
export function DashboardStudyCalendar({ items }: DashboardStudyCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const minViewDate = useMemo(() => toMonthStart(today), [today])
  const maxViewDate = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + 1, 1),
    [today],
  )
  const [viewDate, setViewDate] = useState(minViewDate)
  const todayKey = toDateKey(today)

  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth() + 1

  const days = useMemo(() => groupByDate(items), [items])
  const daysByDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  )

  const calendarDays = useMemo(() => {
    const firstDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const firstDayIndex = firstDate.getDay()
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        viewDate.getFullYear(),
        viewDate.getMonth(),
        index - firstDayIndex + 1,
      )
      return {
        date,
        key: toDateKey(date),
        isCurrentMonth: date.getMonth() === viewDate.getMonth(),
      }
    })
  }, [viewDate])

  const canGoPrev = viewDate.getTime() > minViewDate.getTime()
  const canGoNext = viewDate.getTime() < maxViewDate.getTime()

  const changeMonth = (offset: number) => {
    setViewDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    )
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={!canGoPrev}
          className="flex size-8 items-center justify-center rounded-ait-s text-text-secondary hover:bg-status-neutral-surface disabled:pointer-events-none disabled:opacity-40"
          aria-label="이전 달"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <p className="text-body-1 font-semibold text-text-primary">
          {viewYear}년 {viewMonth}월
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={!canGoNext}
          className="flex size-8 items-center justify-center rounded-ait-s text-text-secondary hover:bg-status-neutral-surface disabled:pointer-events-none disabled:opacity-40"
          aria-label="다음 달"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4">
        <div className="grid grid-cols-7" role="row">
          {weekdayLabels.map((label, index) => (
            <div
              key={label}
              className={cn(
                'py-1 text-center text-caption font-semibold',
                index === 0
                  ? 'text-status-error'
                  : index === 6
                    ? 'text-tag-be'
                    : 'text-text-primary',
              )}
              role="columnheader"
            >
              {label}
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-7"
          role="grid"
          aria-label={`${viewYear}년 ${viewMonth}월`}
        >
          {calendarDays.map(({ date, key, isCurrentMonth }) => {
            const day = daysByDate.get(key)
            const isToday = key === todayKey
            const weekday = date.getDay()
            const tooltipId = `dashboard-study-calendar-${key}`
            return (
              <div key={key} className="group relative">
                <button
                  type="button"
                  role="gridcell"
                  aria-current={isToday ? 'date' : undefined}
                  aria-describedby={day ? tooltipId : undefined}
                  className={cn(
                    'relative flex min-h-11 w-full flex-col items-center justify-start rounded-ait-s px-1 py-2 text-caption transition-colors',
                    day && 'hover:bg-status-neutral-surface',
                    !isCurrentMonth && 'text-chart-axis',
                    isCurrentMonth && weekday === 0 && 'text-status-error',
                    isCurrentMonth && weekday === 6 && 'text-tag-be',
                    isCurrentMonth &&
                      weekday !== 0 &&
                      weekday !== 6 &&
                      'text-text-primary',
                  )}
                  aria-label={`${key}${isToday ? ', 오늘' : ''}${day ? ', 스터디 일정 있음' : ''}`}
                >
                  <span
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded-ait-pill',
                      isToday &&
                        'study-calendar-today font-semibold text-surface-default',
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {day ? (
                    <span className="relative mt-1 inline-flex" aria-hidden="true">
                      <span className="size-1.5 rounded-ait-pill bg-calendar-dot" />
                      {day.entries.length > 1 ? (
                        <span className="absolute -right-2 -top-2 text-[10px] font-bold leading-none text-calendar-dot">
                          +
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </button>

                {day ? (
                  <div
                    id={tooltipId}
                    role="tooltip"
                    className={cn(
                      'pointer-events-none absolute top-[calc(100%+0.375rem)] z-(--z-index-dropdown) w-56 origin-top whitespace-normal rounded-ait-s border border-border-default bg-surface-default p-3 text-left opacity-0 shadow-elevation-2 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
                      weekday === 0
                        ? 'left-0'
                        : weekday === 6
                          ? 'right-0'
                          : 'left-1/2 -translate-x-1/2',
                    )}
                  >
                    <ul className="space-y-2.5">
                      {day.entries.map((entry) => (
                        <li key={entry.calendarId} className="flex items-start gap-2">
                          <span className="mt-0.5 flex shrink-0 items-center gap-1 text-caption text-text-secondary">
                            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                            {entry.time || '미정'}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-caption text-text-primary">
                              {entry.content}
                            </p>
                            <Link
                              to={`/study/groups/${entry.groupId}`}
                              className="mt-0.5 inline-block truncate text-caption text-action-primary hover:underline"
                            >
                              {entry.groupTitle}
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

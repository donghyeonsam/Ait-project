import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown'
import { Input } from '@/components/ui/input'
import { toErrorMessage } from '@/api/http'
import {
  createStudyCalendar,
  deleteStudyCalendar,
  getDailyStudyCalendars,
  getMonthlyStudyCalendars,
  updateStudyCalendar,
  type StudyCalendar as StudyCalendarItem,
} from '@/api/study-calendars'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'

interface StudyCalendarProps {
  groupId: number
  canManage: boolean
}

// 서버는 진행 내용 한 줄을 한 건으로 저장하므로, 같은 날짜의 여러 건을 날짜 단위로 묶어 화면에서 다룬다.
interface StudyCalendarDay {
  date: string
  startTime: string
  entries: { calendarId: number; content: string }[]
}

// 일정 추가·편집 폼이 다루는 상태로, agenda는 편집 중인 진행 내용 줄 목록이다.
interface ScheduleFormState {
  mode: 'create' | 'edit'
  dateKey: string
  startTime: string
  agenda: string[]
}

const monthOptions: DropdownOption<string>[] = Array.from(
  { length: 12 },
  (_, index) => ({
    value: String(index + 1),
    label: `${index + 1}월`,
  }),
)

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSelectedDate(dateKey: string) {
  return dateKey.replaceAll('-', '. ')
}

// 서버의 LocalDateTime은 시간대 표기가 없어, Date로 바꾸지 않고 문자열에서 날짜와 시각을 잘라 쓴다.
function toDayKeyAndTime(startTime: string) {
  return { dateKey: startTime.slice(0, 10), time: startTime.slice(11, 16) }
}

function groupByDate(calendars: StudyCalendarItem[]) {
  const daysByDate = new Map<string, StudyCalendarDay>()

  for (const calendar of calendars) {
    const { dateKey, time } = toDayKeyAndTime(calendar.startTime)
    const entry = { calendarId: calendar.calendarId, content: calendar.content }
    const day = daysByDate.get(dateKey)

    if (day) {
      day.entries.push(entry)
      continue
    }
    daysByDate.set(dateKey, { date: dateKey, startTime: time, entries: [entry] })
  }

  return [...daysByDate.values()]
}

// 기본에는 월력을 가득 보여주고 날짜 선택 시 왼쪽 상세 패널에서 일정을 추가·편집·삭제한다.
export function StudyCalendar({ groupId, canManage }: StudyCalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [calendars, setCalendars] = useState<StudyCalendarItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(
    null,
  )
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null)
  const [isDayRefreshing, setIsDayRefreshing] = useState(false)
  // 어느 날짜의 실패인지 함께 담아, 다른 날짜를 열었을 때 지난 오류가 남지 않게 한다.
  const [dayRefreshError, setDayRefreshError] = useState<{
    dateKey: string
    message: string
  } | null>(null)
  const todayKey = toDateKey(new Date())
  const { ref: sectionRef, isInView } = useInView<HTMLElement>({
    threshold: 0.05,
  })

  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth() + 1
  const yearOptions = useMemo<DropdownOption<string>[]>(
    () =>
      Array.from({ length: 11 }, (_, index) => {
        const year = viewYear - 5 + index
        return { value: String(year), label: `${year}년` }
      }),
    [viewYear],
  )

  // 최초 로딩은 isLoading 초기값(true)이 담당하고, 달 이동·재시도 시에만 호출부에서 다시 세운다.
  const loadCalendars = useCallback(
    () =>
      getMonthlyStudyCalendars(groupId, viewYear, viewMonth)
        .then((response) => {
          setCalendars(response)
          setLoadError(null)
        })
        .catch((error: unknown) => {
          setCalendars([])
          setLoadError(toErrorMessage(error))
        })
        .finally(() => setIsLoading(false)),
    [groupId, viewYear, viewMonth],
  )

  useEffect(() => {
    void loadCalendars()
  }, [loadCalendars])

  // 월별 조회 이후 다른 그룹원이 바꾼 일정이 있을 수 있어, 날짜를 열 때 그 날짜만 다시 확인한다.
  // 진행 표시는 loadCalendars와 같이 호출부에서 세운다.
  const refreshSelectedDay = useCallback(
    (dateKey: string) =>
      getDailyStudyCalendars(groupId, dateKey)
        .then((response) => {
          // 조회한 날짜의 항목만 응답으로 교체해, 월별 조회로 받은 다른 날짜는 건드리지 않는다.
          setCalendars((current) => [
            ...current.filter(
              (calendar) =>
                toDayKeyAndTime(calendar.startTime).dateKey !== dateKey,
            ),
            ...response,
          ])
          setDayRefreshError(null)
        })
        // 월별 조회로 받은 값이 남아 있으므로 화면을 비우지 않고 상세 패널에서만 알린다.
        .catch((error: unknown) => {
          setDayRefreshError({ dateKey, message: toErrorMessage(error) })
        })
        .finally(() => setIsDayRefreshing(false)),
    [groupId],
  )

  useEffect(() => {
    if (!selectedDateKey) return
    void refreshSelectedDay(selectedDateKey)
  }, [selectedDateKey, refreshSelectedDay])

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

  const days = useMemo(() => groupByDate(calendars), [calendars])
  const daysByDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  )
  const selectedDay = selectedDateKey
    ? daysByDate.get(selectedDateKey)
    : undefined
  const scheduleAgenda = scheduleForm?.agenda ?? []
  const canSaveSchedule = scheduleAgenda.some((line) => line.trim().length > 0)

  const changeMonth = (offset: number) => {
    setIsLoading(true)
    setViewDate(
      (currentDate) =>
        new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1),
    )
    setSelectedDateKey(null)
  }

  const selectYear = (year: string) => {
    const nextYear = Number(year)
    if (nextYear === viewYear) return

    setIsLoading(true)
    setViewDate(new Date(nextYear, viewDate.getMonth(), 1))
    setSelectedDateKey(null)
  }

  const selectMonth = (month: string) => {
    const nextMonth = Number(month)
    if (nextMonth === viewMonth) return

    setIsLoading(true)
    setViewDate(new Date(viewDate.getFullYear(), nextMonth - 1, 1))
    setSelectedDateKey(null)
  }

  const selectDate = (date: Date, key: string) => {
    const isOpening = selectedDateKey !== key
    setSelectedDateKey(isOpening ? key : null)
    // 날짜가 열릴 때만 일별 조회가 이어진다.
    if (isOpening) setIsDayRefreshing(true)
    if (date.getMonth() !== viewDate.getMonth()) {
      setIsLoading(true)
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const openCreateForm = (dateKey: string) => {
    if (!canManage) return

    setRequestError(null)
    setScheduleForm({
      mode: 'create',
      dateKey,
      startTime: '',
      agenda: [''],
    })
  }

  const openEditForm = (day: StudyCalendarDay) => {
    if (!canManage) return

    setRequestError(null)
    setScheduleForm({
      mode: 'edit',
      dateKey: day.date,
      startTime: day.startTime,
      agenda: day.entries.map((entry) => entry.content),
    })
  }

  // 폼 날짜보다 앞선 일정 중 가장 최근 것을 불러오기 템플릿으로 쓴다. 조회한 달 안에서만 찾는다.
  const latestPastDay = useMemo(() => {
    if (!scheduleForm) return undefined
    return days
      .filter((day) => day.date < scheduleForm.dateKey && day.entries.length > 0)
      .sort((first, second) => second.date.localeCompare(first.date))[0]
  }, [days, scheduleForm])

  const loadLatestPastDay = () => {
    if (!latestPastDay) return
    setScheduleForm((current) =>
      current
        ? {
            ...current,
            startTime: latestPastDay.startTime || current.startTime,
            agenda: latestPastDay.entries.map((entry) => entry.content),
          }
        : current,
    )
  }

  const updateAgendaLine = (index: number, value: string) =>
    setScheduleForm((current) =>
      current
        ? {
            ...current,
            agenda: current.agenda.map((line, lineIndex) =>
              lineIndex === index ? value : line,
            ),
          }
        : current,
    )

  const addAgendaLine = () =>
    setScheduleForm((current) =>
      current ? { ...current, agenda: [...current.agenda, ''] } : current,
    )

  const removeAgendaLine = (index: number) =>
    setScheduleForm((current) =>
      current
        ? {
            ...current,
            agenda: current.agenda.filter((_, lineIndex) => lineIndex !== index),
          }
        : current,
    )

  const saveSchedule = async () => {
    if (!canManage || !scheduleForm) return
    const cleanedAgenda = scheduleForm.agenda
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    if (cleanedAgenda.length === 0) return

    const { dateKey, startTime } = scheduleForm
    const existingEntries = daysByDate.get(dateKey)?.entries ?? []
    // 시간을 비워 두면 자정으로 저장한다. 서버에 "시간 미정"을 표현할 자리가 없다.
    const toStartTime = (key: string) => `${key}T${startTime || '00:00'}:00`

    setIsSaving(true)
    setRequestError(null)

    try {
      // 기존 건과 입력 줄을 순서대로 맞춰 수정하고, 남는 줄은 등록하고 남는 기존 건은 삭제한다.
      await Promise.all([
        ...cleanedAgenda.map((content, index) => {
          const existing = existingEntries[index]
          const request = { content, startTime: toStartTime(dateKey) }
          return existing
            ? updateStudyCalendar(groupId, existing.calendarId, request)
            : createStudyCalendar(groupId, request)
        }),
        ...existingEntries
          .slice(cleanedAgenda.length)
          .map((entry) => deleteStudyCalendar(groupId, entry.calendarId)),
      ])

      await loadCalendars()
      setSelectedDateKey(dateKey)
      setScheduleForm(null)
    } catch (error) {
      setRequestError(toErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDeleteSchedule = async () => {
    if (!canManage || !deleteTargetKey) return
    const entries = daysByDate.get(deleteTargetKey)?.entries ?? []

    setIsDeleting(true)
    setRequestError(null)

    try {
      await Promise.all(
        entries.map((entry) => deleteStudyCalendar(groupId, entry.calendarId)),
      )
      await loadCalendars()
      setDeleteTargetKey(null)
    } catch (error) {
      setRequestError(toErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section
      ref={sectionRef}
      className={cn(
        'study-reveal min-w-0 rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1 sm:p-6',
        isInView && 'is-visible',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-h3 text-text-primary">
          <CalendarDays className="size-6" aria-hidden="true" />
          스터디 캘린더
        </h2>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="flex size-10 items-center justify-center rounded-ait-s text-text-secondary hover:bg-status-neutral-surface"
            aria-label="이전 달"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <Dropdown
              options={yearOptions}
              value={String(viewYear)}
              onChange={selectYear}
              ariaLabel="연도 선택"
              className="w-28"
              buttonClassName="h-10 border-0 px-2 py-0 text-h2 text-text-primary hover:bg-status-neutral-surface"
              listboxClassName="max-h-[12.5rem] overflow-y-auto overscroll-contain"
            />
            <Dropdown
              options={monthOptions}
              value={String(viewMonth)}
              onChange={selectMonth}
              ariaLabel="월 선택"
              className="w-24"
              buttonClassName="h-10 border-0 px-2 py-0 text-h2 text-text-primary hover:bg-status-neutral-surface"
              listboxClassName="max-h-[12.5rem] overflow-y-auto overscroll-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="flex size-10 items-center justify-center rounded-ait-s text-text-secondary hover:bg-status-neutral-surface"
            aria-label="다음 달"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-caption text-text-secondary" role="status">
          일정을 불러오고 있어요...
        </p>
      ) : loadError ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-caption text-status-error" role="alert">
            {loadError}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="h-8 py-0 text-caption"
            onClick={() => {
              setIsLoading(true)
              void loadCalendars()
            }}
          >
            다시 시도
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          'mt-6 grid gap-6 transition-[grid-template-columns] [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-emphasized)]',
          selectedDateKey && 'lg:grid-cols-[13rem_minmax(0,1fr)]',
        )}
      >
        {selectedDateKey ? (
          <aside className="study-calendar-detail rounded-ait-s border border-border-default p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-body-1 font-semibold text-text-primary">
                {formatSelectedDate(selectedDateKey)}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className="flex size-8 items-center justify-center rounded-ait-s text-text-secondary hover:bg-status-neutral-surface"
                aria-label="날짜 상세 닫기"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {isDayRefreshing ? (
              <p className="mt-1 text-caption text-text-secondary" role="status">
                최신 일정을 확인하고 있어요...
              </p>
            ) : dayRefreshError?.dateKey === selectedDateKey ? (
              <div className="mt-1">
                <p className="text-caption text-status-error" role="alert">
                  최신 일정을 확인하지 못했습니다. 아래 내용은 이 달을 불러온
                  시점의 정보입니다.
                </p>
                <Button
                  type="button"
                  variant="text"
                  className="mt-1 h-6 px-0 py-0 text-caption"
                  onClick={() => {
                    setIsDayRefreshing(true)
                    void refreshSelectedDay(selectedDateKey)
                  }}
                >
                  다시 확인
                </Button>
              </div>
            ) : null}

            {selectedDay ? (
              <>
                <p className="mt-2 flex items-center gap-1.5 text-caption text-text-secondary">
                  <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                  {selectedDay.startTime
                    ? `${selectedDay.startTime} 시작`
                    : '시간 미정'}
                </p>
                <div className="mt-6">
                  <h4 className="text-body-2 font-semibold text-text-primary">
                    참석 현황
                  </h4>
                  {/* TODO: 실제 API 연동 필요 — 출석 기록 엔드포인트가 없어 항상 빈 상태로 둔다. */}
                  <p className="mt-2 text-caption text-text-secondary">
                    출석 기록이 아직 없습니다.
                  </p>
                </div>

                <div className="mt-6">
                  <h4 className="text-body-2 font-semibold text-text-primary">
                    진행 내용
                  </h4>
                  <ul className="mt-2 list-disc space-y-2 pl-4 text-caption text-text-secondary">
                    {selectedDay.entries.map((entry) => (
                      <li key={entry.calendarId}>{entry.content}</li>
                    ))}
                  </ul>
                </div>

                {canManage ? (
                  <div className="mt-6 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 w-full gap-1 py-0 text-caption [&_svg]:size-3.5"
                      onClick={() => openEditForm(selectedDay)}
                    >
                      <Pencil aria-hidden="true" />
                      일정 편집
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-8 w-full gap-1 py-0 text-caption text-white [&_svg]:size-3.5"
                      onClick={() => {
                        setRequestError(null)
                        setDeleteTargetKey(selectedDay.date)
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                      일정 삭제
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-6 space-y-4">
                <p className="text-body-2 text-text-secondary">
                  예정된 스터디가 없습니다.
                </p>
                {canManage ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 w-full gap-1 py-0 text-caption [&_svg]:size-3.5"
                    onClick={() => openCreateForm(selectedDateKey)}
                  >
                    <Plus aria-hidden="true" />
                    일정 추가
                  </Button>
                ) : null}
              </div>
            )}
          </aside>
        ) : null}

        <div className="min-w-0">
          <div className="grid grid-cols-7" role="row">
            {weekdayLabels.map((label, index) => (
              <div
                key={label}
                className={cn(
                  'py-2 text-center text-body-2 font-semibold',
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
              const isSelected = key === selectedDateKey
              const isToday = key === todayKey
              const weekday = date.getDay()
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => selectDate(date, key)}
                  className={cn(
                    'relative flex min-h-14 flex-col items-center justify-start rounded-ait-s px-1 py-3 text-body-2 transition-colors hover:bg-status-neutral-surface',
                    !isCurrentMonth && 'text-chart-axis',
                    isCurrentMonth && weekday === 0 && 'text-status-error',
                    isCurrentMonth && weekday === 6 && 'text-tag-be',
                    isCurrentMonth &&
                      weekday !== 0 &&
                      weekday !== 6 &&
                      'text-text-primary',
                    isSelected && 'bg-status-info-surface font-semibold',
                  )}
                  aria-label={`${key}${isToday ? ', 오늘' : ''}${day ? ', 스터디 일정 있음' : ''}`}
                >
                  <span
                    className={cn(
                      'inline-flex size-8 items-center justify-center rounded-ait-pill',
                      isToday &&
                        'study-calendar-today font-semibold text-surface-default',
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {day ? (
                    <span
                      className="mt-1 size-1.5 rounded-ait-pill bg-calendar-dot"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <Dialog
        open={scheduleForm !== null}
        onOpenChange={(open) => {
          if (open || isSaving) return
          setScheduleForm(null)
        }}
      >
        <DialogContent className="w-[min(32rem,calc(100vw-2rem))] border border-border-default p-6">
          <DialogHeader>
            <DialogTitle>
              {scheduleForm?.mode === 'edit' ? '일정 편집' : '일정 추가'}
            </DialogTitle>
            <DialogDescription>
              {scheduleForm ? formatSelectedDate(scheduleForm.dateKey) : ''} 스터디
              진행 내용을 작성하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <p className="text-body-2 font-semibold text-text-primary">
              시작 시간
            </p>
            <Input
              type="time"
              className="mt-2"
              value={scheduleForm?.startTime ?? ''}
              onChange={(changeEvent) =>
                setScheduleForm((current) =>
                  current
                    ? { ...current, startTime: changeEvent.target.value }
                    : current,
                )
              }
              aria-label="시작 시간"
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-body-2 font-semibold text-text-primary">
                진행 내용
              </p>
              <Button
                type="button"
                variant="text"
                className="h-8 gap-1 py-0 text-caption [&_svg]:size-3.5"
                onClick={loadLatestPastDay}
                disabled={!latestPastDay}
              >
                <History aria-hidden="true" />
                지난 일정 불러오기
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {scheduleAgenda.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={line}
                    onChange={(changeEvent) =>
                      updateAgendaLine(index, changeEvent.target.value)
                    }
                    placeholder="예: 최종 PT 리허설"
                    aria-label={`진행 내용 ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeAgendaLine(index)}
                    disabled={scheduleAgenda.length === 1}
                    className="flex size-10 shrink-0 items-center justify-center rounded-ait-s text-text-secondary hover:bg-status-neutral-surface disabled:pointer-events-none disabled:opacity-40"
                    aria-label={`진행 내용 ${index + 1} 삭제`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="text"
              className="mt-2"
              onClick={addAgendaLine}
            >
              <Plus aria-hidden="true" />
              항목 추가
            </Button>
          </div>

          {requestError ? (
            <p className="mt-4 text-body-2 text-status-error" role="alert">
              {requestError}
            </p>
          ) : null}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving}
              onClick={() => setScheduleForm(null)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void saveSchedule()}
              disabled={!canSaveSchedule || isSaving}
              aria-busy={isSaving}
            >
              {isSaving ? '저장 중' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTargetKey !== null}
        onOpenChange={(open) => {
          if (open || isDeleting) return
          setDeleteTargetKey(null)
        }}
      >
        <DialogContent
          className="w-[min(28rem,calc(100vw-2rem))] border border-border-default p-6"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>일정을 삭제할까요?</DialogTitle>
            <DialogDescription>
              {deleteTargetKey ? formatSelectedDate(deleteTargetKey) : ''} 일정과
              진행 내용이 사라지며 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {requestError ? (
            <p className="mt-4 text-body-2 text-status-error" role="alert">
              {requestError}
            </p>
          ) : null}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setDeleteTargetKey(null)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeleteSchedule()}
              disabled={isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? '삭제 중' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

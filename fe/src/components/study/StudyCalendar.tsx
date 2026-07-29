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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createStudyCalendar,
  deleteStudyCalendar,
  getStudyCalendars,
  updateStudyCalendar,
  type StudyCalendarItem,
} from '@/api/study-calendars'
import { toErrorMessage } from '@/api/http'
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
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'

interface StudyCalendarProps {
  groupId: number
}

type RepeatValue = 'none' | '2' | '4' | '8'

interface StudyCalendarEvent {
  calendarId: number
  date: string
  startTime: string
  attendance: Array<{
    name: string
    attended: boolean
  }>
  agenda: string[]
}

// 일정 추가·편집 폼이 다루는 상태로, agenda는 편집 중인 진행 내용 줄 목록이다.
interface ScheduleFormState {
  mode: 'create' | 'edit'
  dateKey: string
  startTime: string
  repeat: RepeatValue
  agenda: string[]
}

const repeatOptions: DropdownOption<RepeatValue>[] = [
  { value: 'none', label: '반복 안 함' },
  { value: '2', label: '매주 · 2회' },
  { value: '4', label: '매주 · 4회' },
  { value: '8', label: '매주 · 8회' },
]

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

function addWeeksToDateKey(dateKey: string, weeks: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return toDateKey(new Date(year, month - 1, day + weeks * 7))
}

function toCalendarEvent(item: StudyCalendarItem): StudyCalendarEvent {
  const [date = '', time = ''] = item.startTime.split('T')
  const agenda = item.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return {
    calendarId: item.calendarId,
    date,
    startTime: time.slice(0, 5),
    attendance: [],
    agenda: agenda.length > 0 ? agenda : [item.content],
  }
}

function toCalendarRequest(
  dateKey: string,
  startTime: string,
  agenda: string[],
) {
  return {
    content: agenda.join('\n'),
    startTime: `${dateKey}T${startTime || '00:00'}:00`,
  }
}

// 기본에는 월력을 가득 보여주고 날짜 선택 시 왼쪽 상세 패널에서 일정을 추가·편집·삭제한다.
export function StudyCalendar({ groupId }: StudyCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [events, setEvents] = useState<StudyCalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(
    null,
  )
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null)
  const loadGenerationRef = useRef(0)
  const todayKey = toDateKey(new Date())
  const { ref: sectionRef, isInView } = useInView<HTMLElement>({
    threshold: 0.05,
  })

  const loadCalendars = useCallback(async () => {
    const generation = loadGenerationRef.current + 1
    loadGenerationRef.current = generation
    setIsLoading(true)
    setError(null)

    try {
      const response = await getStudyCalendars(
        groupId,
        viewDate.getFullYear(),
        viewDate.getMonth() + 1,
      )
      if (loadGenerationRef.current !== generation) return
      setEvents(response.map(toCalendarEvent))
    } catch (requestError) {
      if (loadGenerationRef.current !== generation) return
      setError(toErrorMessage(requestError))
    } finally {
      if (loadGenerationRef.current === generation) setIsLoading(false)
    }
  }, [groupId, viewDate])

  useEffect(() => {
    const generation = loadGenerationRef.current + 1
    loadGenerationRef.current = generation

    void getStudyCalendars(
      groupId,
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
    )
      .then((response) => {
        if (loadGenerationRef.current !== generation) return
        setEvents(response.map(toCalendarEvent))
      })
      .catch((requestError: unknown) => {
        if (loadGenerationRef.current !== generation) return
        setError(toErrorMessage(requestError))
      })
      .finally(() => {
        if (loadGenerationRef.current === generation) setIsLoading(false)
      })
  }, [groupId, viewDate])

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

  const eventsByDate = useMemo(
    () => new Map(events.map((event) => [event.date, event])),
    [events],
  )
  const selectedEvent = selectedDateKey
    ? eventsByDate.get(selectedDateKey)
    : undefined
  const scheduleAgenda = scheduleForm?.agenda ?? []
  const canSaveSchedule = scheduleAgenda.some((line) => line.trim().length > 0)

  const changeMonth = (offset: number) => {
    setIsLoading(true)
    setError(null)
    setViewDate(
      (currentDate) =>
        new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1),
    )
    setSelectedDateKey(null)
  }

  const selectDate = (date: Date, key: string) => {
    setSelectedDateKey((currentKey) => (currentKey === key ? null : key))
    if (date.getMonth() !== viewDate.getMonth()) {
      setIsLoading(true)
      setError(null)
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const openCreateForm = (dateKey: string) =>
    setScheduleForm({
      mode: 'create',
      dateKey,
      startTime: '',
      repeat: 'none',
      agenda: [''],
    })

  const openEditForm = (event: StudyCalendarEvent) =>
    setScheduleForm({
      mode: 'edit',
      dateKey: event.date,
      startTime: event.startTime ?? '',
      repeat: 'none',
      agenda: event.agenda.length > 0 ? [...event.agenda] : [''],
    })

  // 폼 날짜보다 앞선 일정 중 가장 최근 것을 불러오기 템플릿으로 쓴다.
  const latestPastEvent = useMemo(() => {
    if (!scheduleForm) return undefined
    return events
      .filter(
        (event) =>
          event.date < scheduleForm.dateKey && event.agenda.length > 0,
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0]
  }, [events, scheduleForm])

  const loadLatestPastEvent = () => {
    if (!latestPastEvent) return
    setScheduleForm((current) =>
      current
        ? {
            ...current,
            startTime: latestPastEvent.startTime ?? current.startTime,
            agenda: [...latestPastEvent.agenda],
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
    if (!scheduleForm) return
    const cleanedAgenda = scheduleForm.agenda
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    if (cleanedAgenda.length === 0) return
    if (cleanedAgenda.join('\n').length > 255) {
      setError('진행 내용은 합계 255자 이내로 입력해주세요.')
      return
    }

    const { dateKey, mode, startTime, repeat } = scheduleForm
    setIsMutating(true)
    setError(null)
    try {
      if (mode === 'edit') {
        const target = eventsByDate.get(dateKey)
        if (!target) return
        await updateStudyCalendar(
          groupId,
          target.calendarId,
          toCalendarRequest(dateKey, startTime, cleanedAgenda),
        )
      } else {
        const repeatCount = repeat === 'none' ? 1 : Number(repeat)
        const occupiedDates = new Set(events.map((event) => event.date))
        for (let week = 0; week < repeatCount; week += 1) {
          const targetDateKey =
            week === 0 ? dateKey : addWeeksToDateKey(dateKey, week)
          if (week > 0 && occupiedDates.has(targetDateKey)) continue
          await createStudyCalendar(
            groupId,
            toCalendarRequest(targetDateKey, startTime, cleanedAgenda),
          )
        }
      }
      await loadCalendars()
      setSelectedDateKey(dateKey)
      setScheduleForm(null)
    } catch (requestError) {
      setError(toErrorMessage(requestError))
    } finally {
      setIsMutating(false)
    }
  }

  const confirmDeleteSchedule = async () => {
    if (!deleteTargetKey) return
    const target = eventsByDate.get(deleteTargetKey)
    if (!target) return

    setIsMutating(true)
    setError(null)
    try {
      await deleteStudyCalendar(groupId, target.calendarId)
      await loadCalendars()
      setDeleteTargetKey(null)
      setSelectedDateKey(null)
    } catch (requestError) {
      setError(toErrorMessage(requestError))
    } finally {
      setIsMutating(false)
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
          <p
            className="min-w-16 text-center text-h2 text-text-primary"
            aria-live="polite"
          >
            {viewDate.getMonth() + 1}월
          </p>
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
          일정을 불러오는 중입니다.
        </p>
      ) : null}
      {error ? (
        <div className="mt-4 flex flex-wrap items-center gap-3" role="alert">
          <p className="text-caption text-status-error">{error}</p>
          <Button
            type="button"
            variant="text"
            className="h-8 py-0 text-caption"
            onClick={() => void loadCalendars()}
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

            {selectedEvent ? (
              <>
                <p className="mt-2 flex items-center gap-1.5 text-caption text-text-secondary">
                  <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                  {selectedEvent.startTime
                    ? `${selectedEvent.startTime} 시작`
                    : '시간 미정'}
                </p>
                <div className="mt-6">
                  <h4 className="text-body-2 font-semibold text-text-primary">
                    참석 현황
                  </h4>
                  {selectedEvent.attendance.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {selectedEvent.attendance.map((attendance) => (
                        <li
                          key={attendance.name}
                          className="flex items-center gap-2 text-caption text-text-secondary"
                        >
                          {attendance.name}
                          <span
                            className={cn(
                              'size-2 rounded-ait-pill',
                              attendance.attended
                                ? 'bg-status-success'
                                : 'bg-status-error',
                            )}
                            aria-label={attendance.attended ? '참석' : '불참'}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-caption text-text-secondary">
                      출석 기록이 아직 없습니다.
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <h4 className="text-body-2 font-semibold text-text-primary">
                    진행 내용
                  </h4>
                  <ul className="mt-2 list-disc space-y-2 pl-4 text-caption text-text-secondary">
                    {selectedEvent.agenda.map((agenda) => (
                      <li key={agenda}>{agenda}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 w-full gap-1 py-0 text-caption [&_svg]:size-3.5"
                    onClick={() => openEditForm(selectedEvent)}
                    disabled={isMutating}
                  >
                    <Pencil aria-hidden="true" />
                    일정 편집
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-8 w-full gap-1 py-0 text-caption text-white [&_svg]:size-3.5"
                    onClick={() => setDeleteTargetKey(selectedEvent.date)}
                    disabled={isMutating}
                  >
                    <Trash2 aria-hidden="true" />
                    일정 삭제
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-6 space-y-4">
                <p className="text-body-2 text-text-secondary">
                  예정된 스터디가 없습니다.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 w-full gap-1 py-0 text-caption [&_svg]:size-3.5"
                  onClick={() => openCreateForm(selectedDateKey)}
                >
                  <Plus aria-hidden="true" />
                  일정 추가
                </Button>
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
            aria-label={`${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`}
          >
            {calendarDays.map(({ date, key, isCurrentMonth }) => {
              const event = eventsByDate.get(key)
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
                  aria-label={`${key}${isToday ? ', 오늘' : ''}${event ? ', 스터디 일정 있음' : ''}`}
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
                  {event ? (
                    <span
                      className={cn(
                        'mt-1 size-1.5 rounded-ait-pill',
                        key.endsWith('-30')
                          ? 'bg-status-error'
                          : 'bg-calendar-dot',
                      )}
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
          if (!open) setScheduleForm(null)
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
            <div>
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
          </div>

          {scheduleForm?.mode === 'create' ? (
            <div className="mt-4">
              <p className="text-body-2 font-semibold text-text-primary">
                반복
              </p>
              <Dropdown
                className="mt-2"
                buttonClassName="h-10 py-0"
                options={repeatOptions}
                value={scheduleForm.repeat}
                onChange={(repeat) =>
                  setScheduleForm((current) =>
                    current ? { ...current, repeat } : current,
                  )
                }
                ariaLabel="반복"
              />
              <p className="mt-1.5 text-caption text-text-secondary">
                같은 요일에 매주 반복 생성되며, 이미 일정이 있는 날은
                건너뜁니다.
              </p>
            </div>
          ) : null}

          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-body-2 font-semibold text-text-primary">
                진행 내용
              </p>
              <Button
                type="button"
                variant="text"
                className="h-8 gap-1 py-0 text-caption [&_svg]:size-3.5"
                onClick={loadLatestPastEvent}
                disabled={!latestPastEvent}
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

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setScheduleForm(null)}
              disabled={isMutating}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void saveSchedule()}
              disabled={!canSaveSchedule || isMutating}
            >
              {isMutating ? '저장 중' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTargetKey !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetKey(null)
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
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTargetKey(null)}
              disabled={isMutating}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeleteSchedule()}
              disabled={isMutating}
            >
              {isMutating ? '삭제 중' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

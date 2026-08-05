import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { DashboardStudyCalendarItem } from '@/api/dashboard'
import { DashboardStudyCalendar } from '@/components/dashboard/DashboardStudyCalendar'

function daysFromToday(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toIsoStart(date: Date, time = '19:00') {
  return `${toDateKey(date)}T${time}:00`
}

function renderCalendar(items: DashboardStudyCalendarItem[]) {
  return render(
    <MemoryRouter>
      <DashboardStudyCalendar items={items} />
    </MemoryRouter>,
  )
}

describe('DashboardStudyCalendar', () => {
  it('일정이 있는 날짜에 마우스를 올리면(포커스) 진행 내용과 그룹 링크가 담긴 툴팁이 연결된다', async () => {
    const user = userEvent.setup()
    const target = daysFromToday(1)
    const items: DashboardStudyCalendarItem[] = [
      {
        calendarId: 1,
        groupId: 42,
        groupTitle: '알고리즘 스터디',
        content: '최종 PT 리허설',
        startTime: toIsoStart(target),
      },
    ]
    renderCalendar(items)

    const cell = screen.getByRole('gridcell', {
      name: new RegExp(`^${toDateKey(target)}`),
    })
    expect(cell).toHaveAttribute('aria-describedby')

    await user.hover(cell)

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveAttribute('id', cell.getAttribute('aria-describedby'))
    expect(screen.getByText('최종 PT 리허설')).toBeInTheDocument()
    const groupLink = screen.getByRole('link', { name: '알고리즘 스터디' })
    expect(groupLink).toHaveAttribute('href', '/study/groups/42')
  })

  it('일정이 없는 날짜에는 툴팁이 연결되지 않는다', () => {
    const target = daysFromToday(2)
    renderCalendar([])

    const cell = screen.getByRole('gridcell', {
      name: new RegExp(`^${toDateKey(target)}`),
    })

    expect(cell).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('하루에 일정이 여러 개면 날짜 칸에 + 표시가 뜨고, 툴팁에는 일정마다 각자의 시간이 표시된다', async () => {
    const user = userEvent.setup()
    const target = daysFromToday(1)
    const items: DashboardStudyCalendarItem[] = [
      {
        calendarId: 1,
        groupId: 42,
        groupTitle: '알고리즘 스터디',
        content: '최종 PT 리허설',
        startTime: toIsoStart(target, '19:00'),
      },
      {
        calendarId: 2,
        groupId: 7,
        groupTitle: 'CS 스터디',
        content: '운영체제 발표',
        startTime: toIsoStart(target, '21:30'),
      },
    ]
    renderCalendar(items)

    const cell = screen.getByRole('gridcell', {
      name: new RegExp(`^${toDateKey(target)}`),
    })
    expect(cell).toHaveTextContent('+')

    await user.hover(cell)

    expect(screen.getByText('19:00')).toBeInTheDocument()
    expect(screen.getByText('21:30')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '알고리즘 스터디' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CS 스터디' })).toBeInTheDocument()
  })
})

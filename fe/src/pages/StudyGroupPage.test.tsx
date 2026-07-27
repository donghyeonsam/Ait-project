import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { StudyGroupPage } from '@/pages/StudyGroupPage'

vi.mock('@/api/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/lib/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      userId: 1,
      email: 'study@example.com',
      nickname: '김아이',
      role: 'USER',
    },
    signOut: vi.fn(),
  }),
}))

function renderStudyGroupPage() {
  return render(
    <MemoryRouter initialEntries={['/study/groups/101']}>
      <Routes>
        <Route path="/study/groups/:studyId" element={<StudyGroupPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('StudyGroupPage', () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollTo = vi.fn()
  })

  it('그룹 운영 정보와 구성원 관리 흐름을 제공한다', async () => {
    const user = userEvent.setup()
    renderStudyGroupPage()

    expect(
      screen.getByRole('heading', { name: '금융권 면접 PT 대비', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '구성원 5 / 8' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '김구미 내보내기' }))
    expect(
      screen.getByRole('heading', { name: '구성원 4 / 8' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: '닉네임으로 초대하기' }),
    )
    await user.type(
      screen.getByRole('textbox', { name: '초대할 닉네임' }),
      '새멤버',
    )
    await user.click(screen.getByRole('button', { name: '초대' }))
    expect(screen.getByText('새멤버')).toBeInTheDocument()
  })

  it('날짜를 선택할 때만 일정 상세를 열고 그룹톡 메시지를 전송한다', async () => {
    const user = userEvent.setup()
    renderStudyGroupPage()

    expect(
      screen.queryByRole('button', { name: '날짜 상세 닫기' }),
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('gridcell', {
        name: '2026-07-21, 스터디 일정 있음',
      }),
    )
    expect(screen.getByText('2026. 07. 21')).toBeInTheDocument()
    expect(screen.getByText('개인별 질문 2개 준비')).toBeInTheDocument()

    const messageInput = screen.getByRole('textbox', {
      name: '그룹톡 메시지 입력',
    })
    await user.type(messageInput, '일정 확인했습니다.{enter}')
    expect(
      within(screen.getByLabelText('그룹톡 메시지')).getByText(
        '일정 확인했습니다.',
      ),
    ).toBeInTheDocument()
  })

  it('그룹톡 높이를 유지하고 이모티콘 입력과 메시지 반응을 지원한다', async () => {
    const user = userEvent.setup()
    renderStudyGroupPage()

    const chatPanel = screen.getByRole('region', { name: '그룹톡' })
    const messageList = screen.getByLabelText('그룹톡 메시지')
    const messageInput = screen.getByRole('textbox', {
      name: '그룹톡 메시지 입력',
    })

    expect(chatPanel).toHaveClass('h-[32rem]', 'overflow-hidden')
    expect(messageList).toHaveClass('overflow-y-auto')

    await user.click(screen.getByRole('button', { name: '이모지 추가' }))
    await user.click(screen.getByRole('button', { name: '😀 입력' }))
    expect(messageInput).toHaveValue('😀')

    await user.click(screen.getByRole('button', { name: '이모티콘 추가' }))
    await user.click(
      screen.getByRole('button', { name: '( •̀ᴗ•́ )و 입력' }),
    )
    expect(messageInput).toHaveValue('😀 ( •̀ᴗ•́ )و')

    await user.click(
      screen.getByRole('button', {
        name: '"발표 자료 오늘 밤까지 공유드릴게요!" 메시지에 이모지 반응 남기기',
      }),
    )
    await user.click(screen.getByRole('button', { name: '🎉 반응 남기기' }))
    expect(
      within(messageList).getByRole('button', { name: '반응 🎉 취소' }),
    ).toBeInTheDocument()
  })
})

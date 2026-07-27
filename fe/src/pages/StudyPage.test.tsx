import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { StudyPage } from '@/pages/StudyPage'

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

function renderStudyPage() {
  return render(
    <MemoryRouter initialEntries={['/study']}>
      <StudyPage />
    </MemoryRouter>,
  )
}

describe('StudyPage', () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollTo = vi.fn()
  })

  it('검색과 더보기를 실제 카드 목록에 반영한다', async () => {
    const user = userEvent.setup()
    renderStudyPage()

    expect(
      screen.getAllByRole('article', { name: /상세 정보$/ }),
    ).toHaveLength(6)

    await user.click(screen.getByRole('button', { name: '더보기' }))
    expect(
      screen.getAllByRole('article', { name: /상세 정보$/ }),
    ).toHaveLength(9)

    await user.type(screen.getByRole('searchbox', { name: '스터디 검색' }), 'ML')
    expect(
      screen.getByRole('article', { name: 'ML 엔지니어 실전 면접 상세 정보' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('article', {
        name: 'REACT 프론트엔드 면접 대비 상세 정보',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('총 1개의 스터디')).toBeInTheDocument()
  })

  it('마이 스터디 그룹 카드를 그룹 상세 라우트에 연결한다', () => {
    renderStudyPage()

    expect(
      screen.getByRole('link', {
        name: '금융권 면접 PT 대비 그룹 페이지로 이동',
      }),
    ).toHaveAttribute('href', '/study/groups/101')
    expect(
      screen.getByRole('link', {
        name: '백엔드 기술 연습 그룹 페이지로 이동',
      }),
    ).toHaveAttribute('href', '/study/groups/102')
  })

  it('스터디 신청 상태와 완료 알림을 갱신한다', async () => {
    const user = userEvent.setup()
    renderStudyPage()

    const firstStudyCard = screen.getAllByRole('article', {
      name: /상세 정보$/,
    })[0]

    expect(
      within(firstStudyCard).queryByRole('button', { name: '신청하기' }),
    ).not.toBeInTheDocument()

    await user.hover(firstStudyCard)
    expect(
      within(firstStudyCard).queryByRole('button', { name: '신청하기' }),
    ).not.toBeInTheDocument()

    fireEvent.transitionEnd(firstStudyCard, { propertyName: 'height' })
    fireEvent.click(
      within(firstStudyCard).getByRole('button', { name: '신청하기' }),
    )
    await user.type(
      screen.getByRole('textbox', { name: '신청 메시지' }),
      '매주 화요일과 목요일 모두 참여할 수 있습니다.',
    )
    await user.click(screen.getByRole('button', { name: '신청 보내기' }))

    fireEvent.mouseEnter(firstStudyCard)
    fireEvent.transitionEnd(firstStudyCard, { propertyName: 'height' })
    expect(
      within(firstStudyCard).getByRole('button', { name: '신청 완료' }),
    ).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      '스터디 신청이 완료되었습니다.',
    )
  })

  it('그룹톡 메시지 전송과 가입 신청 승인을 처리한다', async () => {
    const user = userEvent.setup()
    renderStudyPage()

    const chatButton = screen.getByRole('button', {
      name: '그룹톡 열기',
    })
    expect(chatButton).toHaveAccessibleDescription('새 메시지 42개')
    await user.click(chatButton)
    const chatDialog = screen.getByRole('dialog')
    expect(chatDialog).toHaveClass('study-chat-dialog')
    expect(chatDialog).not.toHaveClass('left-1/2', 'top-1/2')
    const messageInput = within(chatDialog).getByRole('textbox', {
      name: '메시지 입력',
    })
    await user.type(messageInput, '자료 확인했습니다.{enter}')
    expect(
      within(chatDialog).getByText('자료 확인했습니다.'),
    ).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await user.click(
      screen.getByRole('button', {
        name: '금융권 면접 PT 대비 가입 신청 관리',
      }),
    )
    const applicationDialog = screen.getByRole('dialog')
    await user.click(
      within(applicationDialog).getByRole('button', { name: '승인' }),
    )
    expect(within(applicationDialog).getByText('승인 완료')).toBeInTheDocument()
  })
})

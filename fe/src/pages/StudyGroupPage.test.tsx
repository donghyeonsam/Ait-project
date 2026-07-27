import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudyGroupPage } from '@/pages/StudyGroupPage'
import {
  getMyStudyGroups,
  getStudyGroupDetail,
  type MyStudyGroup,
  type StudyGroupDetail,
} from '@/api/study-groups'

vi.mock('@/api/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/api/study-groups', () => ({
  getStudyGroupDetail: vi.fn(),
  getMyStudyGroups: vi.fn(),
  updateStudyGroupStatus: vi.fn(),
}))

vi.mock('@/api/study-sessions', () => ({
  createStudySession: vi.fn(),
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

// userId 1이 그룹장이라 관리자 메뉴와 구성원 관리 UI가 함께 렌더된다.
const groupDetail: StudyGroupDetail = {
  groupId: 101,
  title: '금융권 면접 PT 대비',
  description: '금융권 PT 면접을 함께 준비해요.',
  currentMemberCount: 5,
  capacity: 8,
  createdAt: '2026-07-01T09:00:00',
  ownerId: 1,
  members: [
    { userId: 1, name: '김아이', profileImageUrl: null, owner: true },
    { userId: 2, name: '김구미', profileImageUrl: null, owner: false },
    { userId: 3, name: '최싸피', profileImageUrl: null, owner: false },
    { userId: 4, name: '강프로', profileImageUrl: null, owner: false },
    { userId: 5, name: '이면접', profileImageUrl: null, owner: false },
  ],
}

const myStudyGroups: MyStudyGroup[] = [
  {
    id: 101,
    title: groupDetail.title,
    description: groupDetail.description,
    capacity: groupDetail.capacity,
    currentMemberCount: groupDetail.currentMemberCount,
    groupStatus: 'RECRUITING',
    joinedAt: '2026-07-01T09:00:00',
  },
]

async function renderStudyGroupPage() {
  const result = render(
    <MemoryRouter initialEntries={['/study/groups/101']}>
      <Routes>
        <Route path="/study/groups/:studyId" element={<StudyGroupPage />} />
      </Routes>
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: groupDetail.title, level: 1 })
  return result
}

describe('StudyGroupPage', () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollTo = vi.fn()
  })

  beforeEach(() => {
    vi.mocked(getStudyGroupDetail).mockResolvedValue(groupDetail)
    vi.mocked(getMyStudyGroups).mockResolvedValue(myStudyGroups)
  })

  it('그룹 운영 정보와 구성원 관리 흐름을 제공한다', async () => {
    const user = userEvent.setup()
    await renderStudyGroupPage()

    expect(
      screen.getByRole('heading', { name: '금융권 면접 PT 대비', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '구성원 5 / 8' }),
    ).toBeInTheDocument()

    const recruitmentToggle = screen.getByRole('group', {
      name: '모집 상태 변경',
    })
    await user.click(screen.getByRole('button', { name: '모집 완료' }))
    expect(recruitmentToggle).toHaveClass(
      'border-status-error-border',
      'bg-status-error-surface',
    )
    expect(
      recruitmentToggle.querySelector('.study-recruitment-indicator'),
    ).toHaveClass('translate-x-full')
    expect(
      screen.getByRole('button', { name: '모집 완료' }),
    ).toHaveClass('text-status-error')

    await user.click(screen.getByRole('button', { name: '김구미 내보내기' }))
    expect(
      screen.getByText('구성원 5 / 8', { selector: 'h2' }),
    ).toBeInTheDocument()
    const removalDialog = screen.getByRole('dialog', {
      name: '김구미 님을 내보낼까요?',
    })
    expect(
      within(removalDialog).getByText(
        '내보내면 이 스터디 그룹과 일정에 더 이상 접근할 수 없습니다.',
      ),
    ).toBeInTheDocument()
    await user.click(
      within(removalDialog).getByRole('button', { name: '내보내기' }),
    )
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

  it('오늘 날짜를 현재 날짜로 알리고 pulse 효과를 적용한다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 6, 27, 12))

    try {
      await renderStudyGroupPage()

      const todayCell = screen.getByRole('gridcell', {
        name: '2026-07-27, 오늘',
      })
      expect(todayCell).toHaveAttribute('aria-current', 'date')
      expect(within(todayCell).getByText('27')).toHaveClass(
        'study-calendar-today',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('선택한 멤버에게 그룹장 권한을 위임한다', async () => {
    const user = userEvent.setup()
    await renderStudyGroupPage()

    await user.click(screen.getByRole('button', { name: '그룹장 위임' }))

    const transferDialog = screen.getByRole('dialog', {
      name: '그룹장을 위임할까요?',
    })
    const transferButton = within(transferDialog).getByRole('button', {
      name: '그룹장 위임',
    })
    expect(transferButton).toBeDisabled()
    expect(
      within(transferDialog).queryByRole('radio', { name: /나\(김아이\)/ }),
    ).not.toBeInTheDocument()

    await user.click(
      within(transferDialog).getByRole('radio', { name: /김구미/ }),
    )
    expect(
      within(transferDialog).getByText(
        '김구미 님에게 그룹장 권한을 위임합니다.',
      ),
    ).toBeInTheDocument()
    expect(transferButton).toBeEnabled()
    await user.click(transferButton)

    expect(
      screen.queryByRole('heading', { name: '관리자 메뉴' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/그룹장 김구미/)).toBeInTheDocument()
    expect(screen.getByText(/그룹원 · 그룹장/)).toBeInTheDocument()
  })

  it('날짜를 선택할 때만 일정 상세를 열고 그룹톡 메시지를 전송한다', async () => {
    const user = userEvent.setup()
    await renderStudyGroupPage()

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

  it('메시지 작성 UI와 공지를 작성·조회·수정·삭제한다', async () => {
    const user = userEvent.setup()
    await renderStudyGroupPage()

    const messageInput = screen.getByRole('textbox', {
      name: '그룹톡 메시지 입력',
    })
    const messageComposer = screen.getByRole('group', {
      name: '메시지 작성',
    })
    expect(messageInput).toHaveClass('h-24', 'min-h-24', 'max-h-24')
    const messageInputCard = messageInput.closest<HTMLElement>(
      '[data-message-input-card]',
    )
    expect(messageInputCard).toHaveClass('w-full', 'rounded-ait-m', 'border')
    expect(messageComposer).not.toHaveClass('border')
    expect(
      within(messageComposer).getByRole('button', { name: '사진 첨부' }),
    ).toBeInTheDocument()
    const emojiButton = within(messageComposer).getByRole('button', {
      name: '이모지 추가',
    })
    expect(emojiButton.closest('label')).toBeNull()
    expect(
      emojiButton,
    ).toBeInTheDocument()
    expect(
      within(messageComposer).getByRole('button', {
        name: '이모티콘 추가',
      }),
    ).toBeInTheDocument()
    expect(
      within(messageComposer).getByRole('button', {
        name: '그룹톡 메시지 전송',
      }),
    ).toBeInTheDocument()
    const imageFile = new File(['image'], 'study-plan.png', {
      type: 'image/png',
    })
    await user.upload(
      within(messageComposer).getByLabelText('사진 첨부 파일 선택'),
      imageFile,
    )
    expect(
      await within(messageComposer).findByRole('img', {
        name: 'study-plan.png 미리보기',
      }),
    ).toBeInTheDocument()
    const sendButton = within(messageComposer).getByRole('button', {
      name: '그룹톡 메시지 전송',
    })
    expect(sendButton).toBeEnabled()
    await user.click(sendButton)
    expect(
      within(screen.getByLabelText('그룹톡 메시지')).getByRole('img', {
        name: 'study-plan.png',
      }),
    ).toBeInTheDocument()

    const noticeText = screen.getByTitle(/이번 주 세션은/)
    Object.defineProperties(noticeText, {
      clientWidth: { configurable: true, value: 240 },
      scrollWidth: { configurable: true, value: 640 },
    })
    fireEvent(window, new Event('resize'))
    await user.click(
      screen.getByRole('button', { name: '공지 전체 보기' }),
    )
    expect(noticeText).not.toHaveClass('truncate')
    expect(
      screen.getByRole('button', { name: '공지 접기' }),
    ).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name: '공지 접기' }))
    expect(noticeText).toHaveClass('truncate')

    await user.click(screen.getByRole('button', { name: '공지 수정' }))
    const noticeInput = screen.getByRole('textbox', { name: '공지 내용' })
    await user.clear(noticeInput)
    await user.type(noticeInput, '금요일까지 발표 자료를 공유해 주세요.')
    await user.click(screen.getByRole('button', { name: '공지 저장' }))
    expect(
      screen.getByText('금요일까지 발표 자료를 공유해 주세요.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '공지 삭제' }))
    expect(
      screen.queryByText('금요일까지 발표 자료를 공유해 주세요.'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '공지 작성' }))
    await user.type(
      screen.getByRole('textbox', { name: '공지 내용' }),
      '새 스터디 공지입니다.',
    )
    await user.click(screen.getByRole('button', { name: '공지 저장' }))
    expect(screen.getByText('새 스터디 공지입니다.')).toBeInTheDocument()
  })

  it('그룹톡 높이를 유지하고 이모티콘 입력과 메시지 반응을 지원한다', async () => {
    const user = userEvent.setup()
    await renderStudyGroupPage()

    const chatPanel = screen.getByRole('region', { name: '그룹톡' })
    const messageList = screen.getByLabelText('그룹톡 메시지')
    const messageInput = screen.getByRole('textbox', {
      name: '그룹톡 메시지 입력',
    })

    expect(chatPanel).toHaveClass('h-[32rem]', 'overflow-hidden')
    expect(messageList).toHaveClass('overflow-x-hidden', 'overflow-y-auto')

    await user.click(screen.getByRole('button', { name: '이모지 추가' }))
    await user.click(screen.getByRole('button', { name: '😀 입력' }))
    expect(messageInput).toHaveValue('😀')

    await user.click(screen.getByRole('button', { name: '이모티콘 추가' }))
    await user.click(
      screen.getByRole('button', { name: '( •̀ᴗ•́ )و 입력' }),
    )
    expect(messageInput).toHaveValue('😀 ( •̀ᴗ•́ )و')

    const reactionTrigger = screen.getByRole('button', {
      name: '"발표 자료 오늘 밤까지 공유드릴게요!" 메시지에 이모지 반응 남기기',
    })
    const targetMessage =
      reactionTrigger.closest<HTMLElement>('.study-chat-message')
    expect(reactionTrigger).toHaveClass(
      'pointer-events-none',
      'opacity-0',
      'group-hover/message:pointer-events-auto',
      'group-hover/message:opacity-100',
    )
    expect(targetMessage).toHaveClass(
      'group/message',
      'relative',
      'hover:z-20',
    )
    expect(
      screen.queryByRole('group', { name: '메시지 반응 선택' }),
    ).not.toBeInTheDocument()

    await user.click(reactionTrigger)
    const reactionPicker = screen.getByRole('group', {
      name: '메시지 반응 선택',
    })
    expect(reactionPicker).toHaveClass(
      'study-reaction-picker--incoming',
      'fixed',
    )

    const [additionalReaction] = within(reactionPicker).getAllByRole(
      'button',
      {
        name: '😀 반응 남기기',
      },
    )
    await user.click(additionalReaction)

    const reactionButton = within(targetMessage!).getByRole('button', {
      name: '😀 반응 1개, 내 반응 취소',
    })
    expect(reactionButton).toHaveClass(
      'study-reaction-bubble',
      'inline-flex',
    )
    expect(reactionButton).not.toHaveClass('absolute')
    expect(reactionButton.closest('.mt-1')).toHaveClass(
      'flex',
      'justify-start',
    )
    expect(reactionButton.parentElement).toHaveClass('relative')
    expect(
      within(targetMessage!).getByRole('button', {
        name: '👍 반응 1개 추가',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: '"발표 자료 오늘 밤까지 공유드릴게요!" 메시지에 이모지 반응 남기기',
      }),
    ).toBe(reactionTrigger)
  })
})

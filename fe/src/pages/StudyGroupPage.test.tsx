import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudyGroupPage } from '@/pages/StudyGroupPage'
import {
  delegateStudyGroupLeader,
  getMyActiveStudyGroups,
  getMyStudyGroups,
  getStudyGroupApplications,
  getStudyGroupDetail,
  kickStudyGroupMember,
  leaveStudyGroup,
  type MyStudyGroup,
  type StudyGroupDetail,
} from '@/api/study-groups'
import { getStudyGroupActiveSession } from '@/api/study-sessions'
import {
  createStudyCalendar,
  getDailyStudyCalendars,
  getMonthlyStudyCalendars,
} from '@/api/study-calendars'
import {
  connectStudyGroupChat,
  deleteStudyGroupChatNotice,
  getStudyGroupChats,
  sendStudyGroupChatMessage,
  sendStudyGroupChatNotice,
  type StudyGroupChatMessage,
  type StudyGroupChatNotice,
} from '@/api/study-group-chat'
import type { Client } from '@stomp/stompjs'

vi.mock('@/api/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/api/study-groups', () => ({
  getStudyGroupDetail: vi.fn(),
  getMyStudyGroups: vi.fn(),
  getMyActiveStudyGroups: vi.fn(),
  getStudyGroupApplications: vi.fn(),
  updateStudyGroupStatus: vi.fn(),
  kickStudyGroupMember: vi.fn(),
  leaveStudyGroup: vi.fn(),
  delegateStudyGroupLeader: vi.fn(),
}))

vi.mock('@/api/study-sessions', () => ({
  createStudySession: vi.fn(),
  getStudyGroupActiveSession: vi.fn(),
}))

vi.mock('@/api/study-calendars', () => ({
  getMonthlyStudyCalendars: vi.fn(),
  getDailyStudyCalendars: vi.fn(),
  createStudyCalendar: vi.fn(),
  updateStudyCalendar: vi.fn(),
  deleteStudyCalendar: vi.fn(),
}))

vi.mock('@/api/study-group-chat', () => ({
  getStudyGroupChats: vi.fn(),
  connectStudyGroupChat: vi.fn(),
  sendStudyGroupChatMessage: vi.fn(),
  sendStudyGroupChatNotice: vi.fn(),
  deleteStudyGroupChatNotice: vi.fn(),
}))

// connectStudyGroupChat이 넘겨받는 핸들러를 붙잡아, 실제 STOMP 브로드캐스트를 흉내 낼 때 쓴다.
let capturedChatHandlers: {
  onMessage: (message: StudyGroupChatMessage) => void
  onNotice: (notice: StudyGroupChatNotice) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (message: string) => void
} | null = null
const fakeStompClient = {
  connected: true,
  deactivate: vi.fn(),
} as unknown as Client

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
  notice: null,
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
    owner: true,
  },
]

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 캘린더는 이번 달을 조회하므로 고정 날짜 대신 이번 달 기준으로 픅스처를 만든다.
const monthPrefix = toDateKey(new Date()).slice(0, 7)
const scheduledDateKey = `${monthPrefix}-21`
const scheduledCellName = `${scheduledDateKey}${
  scheduledDateKey === toDateKey(new Date()) ? ', 오늘' : ''
}, 스터디 일정 있음`
const studyCalendars = [
  {
    calendarId: 11,
    content: '개인별 질문 2개 준비',
    startTime: `${scheduledDateKey}T20:00:00`,
  },
  {
    calendarId: 12,
    content: '모의 면접 회고',
    startTime: `${scheduledDateKey}T20:00:00`,
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
    vi.mocked(getMyActiveStudyGroups).mockResolvedValue(myStudyGroups)
    vi.mocked(getStudyGroupApplications).mockResolvedValue([])
    vi.mocked(getStudyGroupActiveSession).mockResolvedValue({
      hasActiveSession: false,
      sessionId: null,
    })
    vi.mocked(kickStudyGroupMember).mockResolvedValue(undefined)
    vi.mocked(leaveStudyGroup).mockResolvedValue(undefined)
    vi.mocked(delegateStudyGroupLeader).mockResolvedValue(undefined)
    vi.mocked(getMonthlyStudyCalendars).mockResolvedValue(studyCalendars)
    // 날짜를 열면 그 날짜만 다시 조회하므로, 해당 날짜 일정을 그대로 돌려준다.
    vi.mocked(getDailyStudyCalendars).mockImplementation((_, date) =>
      Promise.resolve(
        studyCalendars.filter((calendar) => calendar.startTime.startsWith(date)),
      ),
    )
    vi.mocked(createStudyCalendar).mockResolvedValue(undefined)

    vi.mocked(getStudyGroupChats).mockResolvedValue({
      chats: [],
      hasNext: false,
    })
    capturedChatHandlers = null
    vi.mocked(connectStudyGroupChat).mockImplementation((_groupId, handlers) => {
      capturedChatHandlers = handlers
      handlers.onConnect?.()
      return fakeStompClient
    })
    vi.mocked(sendStudyGroupChatMessage).mockClear()
    vi.mocked(sendStudyGroupChatNotice).mockClear()
    vi.mocked(deleteStudyGroupChatNotice).mockClear()
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
    expect(kickStudyGroupMember).toHaveBeenCalledWith(101, 2)
    // 내보내기는 서버 요청이므로 응답 후 목록이 줄어드는 것을 기다린다.
    expect(
      await screen.findByRole('heading', { name: '구성원 4 / 8' }),
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

  it('그룹 삭제 시 그룹장의 나가기 API로 그룹을 논리 삭제한다', async () => {
    const user = userEvent.setup()
    vi.mocked(getStudyGroupDetail).mockResolvedValue({
      ...groupDetail,
      currentMemberCount: 1,
      members: [groupDetail.members[0]],
    })

    await renderStudyGroupPage()

    await user.click(screen.getByRole('button', { name: '그룹 삭제' }))
    const deleteDialog = screen.getByRole('dialog', {
      name: '그룹을 삭제할까요?',
    })
    await user.click(
      within(deleteDialog).getByRole('button', { name: '그룹 삭제' }),
    )

    expect(leaveStudyGroup).toHaveBeenCalledWith(101)
  })

  it('그룹 상세에 저장된 공지를 진입 시점에 보여준다', async () => {
    vi.mocked(getStudyGroupDetail).mockResolvedValue({
      ...groupDetail,
      notice: '수요일 20:30 시스템 설계 세션 전에 캐시 전략을 정리해 주세요.',
    })

    await renderStudyGroupPage()

    expect(
      screen.getByTitle('수요일 20:30 시스템 설계 세션 전에 캐시 전략을 정리해 주세요.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '공지 작성' }),
    ).not.toBeInTheDocument()
  })

  it('오늘 날짜를 현재 날짜로 알리고 pulse 효과를 적용한다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 6, 27, 12))

    try {
      await renderStudyGroupPage()

      expect(
        screen.getByRole('button', { name: '연도 선택' }),
      ).toHaveTextContent('2026년')
      expect(
        screen.getByRole('button', { name: '월 선택' }),
      ).toHaveTextContent('7월')
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

  it('연도와 월을 드롭다운으로 선택해 해당 월의 일정을 조회한다', async () => {
    const user = userEvent.setup()
    const now = new Date()
    const nextYear = now.getFullYear() + 1
    const nextMonth = now.getMonth() + 1 === 12 ? 11 : now.getMonth() + 2

    await renderStudyGroupPage()

    await user.click(screen.getByRole('button', { name: '연도 선택' }))
    await user.click(
      screen.getByRole('option', { name: `${nextYear}년` }),
    )
    await user.click(screen.getByRole('button', { name: '월 선택' }))
    await user.click(
      screen.getByRole('option', { name: `${nextMonth}월` }),
    )

    expect(
      screen.getByRole('button', { name: '연도 선택' }),
    ).toHaveTextContent(`${nextYear}년`)
    expect(
      screen.getByRole('button', { name: '월 선택' }),
    ).toHaveTextContent(`${nextMonth}월`)
    await waitFor(() => {
      expect(getMonthlyStudyCalendars).toHaveBeenLastCalledWith(
        101,
        nextYear,
        nextMonth,
      )
    })
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

    expect(delegateStudyGroupLeader).toHaveBeenCalledWith(101, 2)
    // 위임은 서버 요청이므로 응답 후 방장 전용 UI가 사라지는 것을 기다린다.
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: '관리자 메뉴' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByText(/그룹장 김구미/)).toBeInTheDocument()
    expect(screen.getByText('김구미').closest('li')).toHaveTextContent(
      '김구미 · 그룹장',
    )
    expect(screen.getByText('김아이').closest('li')).toHaveTextContent(
      '김아이 · 그룹원',
    )
  })

  it('위임 요청이 실패하면 대화상자에 오류를 보여주고 방장 권한을 유지한다', async () => {
    const user = userEvent.setup()
    vi.mocked(delegateStudyGroupLeader).mockRejectedValue(
      new Error('delegation failed'),
    )
    await renderStudyGroupPage()

    await user.click(screen.getByRole('button', { name: '그룹장 위임' }))
    const transferDialog = screen.getByRole('dialog', {
      name: '그룹장을 위임할까요?',
    })
    await user.click(
      within(transferDialog).getByRole('radio', { name: /김구미/ }),
    )
    await user.click(
      within(transferDialog).getByRole('button', { name: '그룹장 위임' }),
    )

    expect(
      await within(transferDialog).findByText(
        '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      ),
    ).toBeInTheDocument()
    expect(transferDialog).toBeInTheDocument()
    // 모달이 열린 동안 바깥 콘텐츠는 aria-hidden이라 hidden 옵션으로 존재만 확인한다.
    expect(
      screen.getByRole('heading', { name: '관리자 메뉴', hidden: true }),
    ).toBeInTheDocument()
  })

  it('날짜를 선택할 때만 일정 상세를 열고 그룹톡 메시지를 전송한다', async () => {
    const user = userEvent.setup()
    await renderStudyGroupPage()

    expect(
      screen.queryByRole('button', { name: '날짜 상세 닫기' }),
    ).not.toBeInTheDocument()
    // 일정은 그룹 정보와 별개로 조회되므로 표시될 때까지 기다린다.
    await user.click(
      await screen.findByRole('gridcell', { name: scheduledCellName }),
    )
    expect(
      screen.getByText(scheduledDateKey.replaceAll('-', '. ')),
    ).toBeInTheDocument()
    expect(screen.getByText('개인별 질문 2개 준비')).toBeInTheDocument()
    expect(screen.getByText('모의 면접 회고')).toBeInTheDocument()
    // 상세를 열면 그 날짜만 다시 조회해 월별 조회 이후의 변경을 반영한다.
    expect(getDailyStudyCalendars).toHaveBeenCalledWith(101, scheduledDateKey)

    const messageInput = screen.getByRole('textbox', {
      name: '그룹톡 메시지 입력',
    })
    await user.type(messageInput, '일정 확인했습니다.{enter}')
    expect(sendStudyGroupChatMessage).toHaveBeenCalledWith(
      fakeStompClient,
      101,
      '일정 확인했습니다.',
    )

    // 서버가 STOMP로 다시 브로드캐스트해준 메시지를 받는 상황을 흉내 낸다.
    act(() => {
      capturedChatHandlers?.onMessage({
        chatId: 1,
        groupId: 101,
        senderId: 1,
        senderNickname: '김아이',
        profileImageUrl: null,
        message: '일정 확인했습니다.',
        createdAt: '2026-07-21T10:00:00',
      })
    })
    expect(
      within(screen.getByLabelText('그룹톡 메시지')).getByText(
        '일정 확인했습니다.',
      ),
    ).toBeInTheDocument()
  })

  it('메시지 작성 UI를 갖추고, 공지를 STOMP로 작성·조회·수정·삭제한다', async () => {
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
    const emojiButton = within(messageComposer).getByRole('button', {
      name: '이모지 추가',
    })
    expect(emojiButton.closest('label')).toBeNull()
    expect(emojiButton).toBeInTheDocument()
    expect(
      within(messageComposer).getByRole('button', {
        name: '이모티콘 추가',
      }),
    ).toBeInTheDocument()
    const sendButton = within(messageComposer).getByRole('button', {
      name: '그룹톡 메시지 전송',
    })
    expect(sendButton).toBeDisabled()
    await user.type(messageInput, '테스트 메시지')
    expect(sendButton).toBeEnabled()

    // 초기 상태는 공지가 없으므로 작성부터 시작한다.
    await user.click(screen.getByRole('button', { name: '공지 작성' }))
    await user.type(
      screen.getByRole('textbox', { name: '공지 내용' }),
      '이번 주 세션은 화 20:00, PT 주제는 금리 인하기 자산 전략입니다.',
    )
    await user.click(screen.getByRole('button', { name: '공지 저장' }))
    expect(sendStudyGroupChatNotice).toHaveBeenCalledWith(
      fakeStompClient,
      101,
      '이번 주 세션은 화 20:00, PT 주제는 금리 인하기 자산 전략입니다.',
    )
    // 실제로는 STOMP 브로드캐스트가 도착해야 화면에 반영되므로 이를 흉내 낸다.
    act(() => {
      capturedChatHandlers?.onNotice({
        groupId: 101,
        notice: '이번 주 세션은 화 20:00, PT 주제는 금리 인하기 자산 전략입니다.',
        updatedAt: '2026-07-21T10:00:00',
      })
    })

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
    expect(sendStudyGroupChatNotice).toHaveBeenCalledWith(
      fakeStompClient,
      101,
      '금요일까지 발표 자료를 공유해 주세요.',
    )
    act(() => {
      capturedChatHandlers?.onNotice({
        groupId: 101,
        notice: '금요일까지 발표 자료를 공유해 주세요.',
        updatedAt: '2026-07-21T11:00:00',
      })
    })
    expect(
      screen.getByText('금요일까지 발표 자료를 공유해 주세요.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '공지 삭제' }))
    expect(deleteStudyGroupChatNotice).toHaveBeenCalledWith(
      fakeStompClient,
      101,
    )
    act(() => {
      capturedChatHandlers?.onNotice({
        groupId: 101,
        notice: null,
        updatedAt: '2026-07-21T12:00:00',
      })
    })
    expect(
      screen.queryByText('금요일까지 발표 자료를 공유해 주세요.'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '공지 작성' }))
    await user.type(
      screen.getByRole('textbox', { name: '공지 내용' }),
      '새 스터디 공지입니다.',
    )
    await user.click(screen.getByRole('button', { name: '공지 저장' }))
    act(() => {
      capturedChatHandlers?.onNotice({
        groupId: 101,
        notice: '새 스터디 공지입니다.',
        updatedAt: '2026-07-21T13:00:00',
      })
    })
    expect(screen.getByText('새 스터디 공지입니다.')).toBeInTheDocument()
  })

  it('그룹톡 높이를 유지하고 이모지·이모티콘 입력을 지원한다', async () => {
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

    await user.click(
      screen.getByRole('button', { name: '그룹톡 메시지 전송' }),
    )
    expect(sendStudyGroupChatMessage).toHaveBeenCalledWith(
      fakeStompClient,
      101,
      '😀 ( •̀ᴗ•́ )و',
    )
    expect(messageInput).toHaveValue('')
  })
})

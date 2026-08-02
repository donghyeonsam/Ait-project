import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudyPage } from '@/pages/StudyPage'
import {
  applyToStudyGroup,
  getMyActiveStudyGroups,
  getMyStudyGroups,
  getStudyGroupDetail,
  getStudyGroups,
  type MyStudyGroup,
  type StudyGroupDetail,
  type StudyGroupListItem,
  type StudyGroupPage,
} from '@/api/study-groups'
import {
  connectStudyGroupChat,
  getStudyGroupChats,
  sendStudyGroupChatMessage,
} from '@/api/study-group-chat'

vi.mock('@/api/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/api/study-groups', () => ({
  getStudyGroups: vi.fn(),
  getMyStudyGroups: vi.fn(),
  getMyActiveStudyGroups: vi.fn(),
  getStudyGroupDetail: vi.fn(),
  createStudyGroup: vi.fn(),
  applyToStudyGroup: vi.fn(),
}))

vi.mock('@/api/study-group-chat', () => ({
  getStudyGroupChats: vi.fn(),
  connectStudyGroupChat: vi.fn(),
  sendStudyGroupChatMessage: vi.fn(),
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

const groupTitles = [
  'ML 엔지니어 실전 면접',
  'REACT 프론트엔드 면접 대비',
  '백엔드 시스템 설계 스터디',
  '인성 면접 집중 훈련',
  'PT 면접 실전 연습',
  '데이터 분석 직무 면접',
  '클라우드 인프라 면접',
  'CS 전공 지식 다지기',
  '포트폴리오 리뷰 모임',
]

// 최신순 정렬을 확인할 수 있도록 생성일을 하루씩 벌려 둔다.
const studyGroups: StudyGroupListItem[] = groupTitles.map((title, index) => ({
  id: index + 1,
  title,
  description: `${title} 소개`,
  capacity: 6,
  currentMemberCount: 3,
  groupStatus: index === 8 ? 'CLOSED' : 'RECRUITING',
  createdAt: `2026-07-${String(20 - index).padStart(2, '0')}T09:00:00`,
}))

const myStudyGroups: MyStudyGroup[] = [
  {
    id: 101,
    title: '금융권 면접 PT 대비',
    description: '금융권 PT 면접을 함께 준비해요.',
    capacity: 6,
    currentMemberCount: 4,
    groupStatus: 'ACTIVE',
    joinedAt: '2026-07-01T09:00:00',
    owner: true,
  },
  {
    id: 102,
    title: '백엔드 기술 연습',
    description: '백엔드 기술 면접을 연습해요.',
    capacity: 8,
    currentMemberCount: 3,
    groupStatus: 'RECRUITING',
    joinedAt: '2026-07-05T09:00:00',
    owner: false,
  },
]

function toPage(content: StudyGroupListItem[]): StudyGroupPage {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 100,
    first: true,
    last: true,
    empty: content.length === 0,
  }
}

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

  beforeEach(() => {
    vi.mocked(getStudyGroups).mockResolvedValue(toPage(studyGroups))
    vi.mocked(getMyStudyGroups).mockResolvedValue(myStudyGroups)
    vi.mocked(applyToStudyGroup).mockResolvedValue(undefined)
    vi.mocked(getMyActiveStudyGroups).mockResolvedValue(myStudyGroups)
    vi.mocked(getStudyGroupDetail).mockResolvedValue({
      notice: null,
    } as unknown as StudyGroupDetail)
    vi.mocked(getStudyGroupChats).mockResolvedValue({
      chats: [],
      hasNext: false,
    })
    // 연결 즉시 onConnect를 호출하고, 전송 시 그대로 수신되는 것처럼 동작하는 STOMP 클라이언트 목이다.
    vi.mocked(connectStudyGroupChat).mockImplementation(
      (_groupId, handlers) => {
        handlers.onConnect?.()
        vi.mocked(sendStudyGroupChatMessage).mockImplementation(
          (_client, sendGroupId, content) => {
            handlers.onMessage({
              chatId: Date.now(),
              groupId: sendGroupId,
              senderId: 1,
              senderNickname: '김아이',
              profileImageUrl: null,
              message: content,
              createdAt: '2026-07-30T09:00:00',
            })
          },
        )
        return {
          connected: true,
          deactivate: vi.fn().mockResolvedValue(undefined),
        } as unknown as ReturnType<typeof connectStudyGroupChat>
      },
    )
  })

  it('서버에서 받은 스터디 목록에 검색과 더보기를 반영한다', async () => {
    const user = userEvent.setup()
    renderStudyPage()

    expect(
      await screen.findAllByRole('article', { name: /상세 정보$/ }),
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

  it('모집 상태 필터를 서버 응답의 groupStatus에 맞춰 적용한다', async () => {
    const user = userEvent.setup()
    renderStudyPage()
    await screen.findAllByRole('article', { name: /상세 정보$/ })

    await user.selectOptions(
      screen.getByRole('combobox', { name: '모집 상태 선택' }),
      'closed',
    )

    expect(screen.getByText('총 1개의 스터디')).toBeInTheDocument()
    expect(
      screen.getByRole('article', { name: '포트폴리오 리뷰 모임 상세 정보' }),
    ).toBeInTheDocument()
  })

  it('목록 카드에 현재 인원과 정원을 함께 표시한다', async () => {
    renderStudyPage()
    const firstCard = (
      await screen.findAllByRole('article', { name: /상세 정보$/ })
    )[0]

    expect(within(firstCard).getByText('3/6명')).toBeInTheDocument()
  })

  it('마이 스터디 카드를 그룹 상세 라우트에 연결한다', async () => {
    renderStudyPage()

    expect(
      await screen.findByRole('link', {
        name: '금융권 면접 PT 대비 그룹 페이지로 이동',
      }),
    ).toHaveAttribute('href', '/study/groups/101')
    expect(
      screen.getByRole('link', {
        name: '백엔드 기술 연습 그룹 페이지로 이동',
      }),
    ).toHaveAttribute('href', '/study/groups/102')
  })

  it('이미 가입한 스터디는 스터디 찾기 목록에서 제외한다', async () => {
    vi.mocked(getStudyGroups).mockResolvedValueOnce(
      toPage([
        ...studyGroups,
        {
          id: 101,
          title: '금융권 면접 PT 대비',
          description: '금융권 PT 면접을 함께 준비해요.',
          capacity: 6,
          currentMemberCount: 4,
          groupStatus: 'ACTIVE',
          createdAt: '2026-07-01T09:00:00',
        },
      ]),
    )

    renderStudyPage()
    await screen.findAllByRole('article', { name: /상세 정보$/ })

    expect(
      screen.queryByRole('article', {
        name: '금융권 면접 PT 대비 상세 정보',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(`총 ${studyGroups.length}개의 스터디`)).toBeInTheDocument()
  })

  it('마이 스터디 카드에 그룹장·그룹원 여부를 표시한다', async () => {
    renderStudyPage()

    const ownerCard = (
      await screen.findByText('금융권 면접 PT 대비')
    ).closest('article')
    const memberCard = screen.getByText('백엔드 기술 연습').closest('article')

    expect(within(ownerCard!).getByText('그룹장')).toBeInTheDocument()
    expect(within(memberCard!).getByText('그룹원')).toBeInTheDocument()
  })

  it('목록 조회에 실패하면 오류와 다시 시도를 안내한다', async () => {
    const user = userEvent.setup()
    vi.mocked(getStudyGroups).mockRejectedValueOnce(new Error('network'))
    renderStudyPage()

    expect(await screen.findByRole('alert')).toBeInTheDocument()

    vi.mocked(getStudyGroups).mockResolvedValue(toPage(studyGroups))
    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(
      await screen.findAllByRole('article', { name: /상세 정보$/ }),
    ).toHaveLength(6)
  })

  it('스터디 신청 상태와 완료 알림을 갱신한다', async () => {
    const user = userEvent.setup()
    renderStudyPage()

    const firstStudyCard = (
      await screen.findAllByRole('article', { name: /상세 정보$/ })
    )[0]

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

    expect(applyToStudyGroup).toHaveBeenCalledWith(
      1,
      '매주 화요일과 목요일 모두 참여할 수 있습니다.',
    )

    fireEvent.mouseEnter(firstStudyCard)
    fireEvent.transitionEnd(firstStudyCard, { propertyName: 'height' })
    expect(
      await within(firstStudyCard).findByRole('button', { name: '신청 완료' }),
    ).toBeDisabled()
    expect(await screen.findByRole('status')).toHaveTextContent(
      '스터디 신청을 보냈습니다.',
    )
  })

  it('그룹톡 전환 팝오버와 메시지 전송을 처리한다', async () => {
    const user = userEvent.setup()
    renderStudyPage()
    await screen.findAllByRole('article', { name: /상세 정보$/ })

    const chatButton = screen.getByRole('button', {
      name: '그룹톡 열기',
    })
    await user.click(chatButton)
    const chatDialog = screen.getByRole('dialog')
    expect(chatDialog).toHaveClass('study-chat-dialog')
    expect(chatDialog).not.toHaveClass('left-1/2', 'top-1/2')
    const groupTrigger = await within(chatDialog).findByRole('button', {
      name: /금융권 면접 PT 대비/,
    })
    expect(groupTrigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(groupTrigger)

    const groupList = within(chatDialog).getByRole('listbox', {
      name: '내 그룹톡',
    })
    const groupOptions = within(groupList).getAllByRole('option')
    expect(groupOptions).toHaveLength(myStudyGroups.length)
    expect(groupOptions[0]).toHaveAttribute('aria-selected', 'true')
    expect(groupOptions[1]).toHaveAttribute('aria-selected', 'false')

    await user.keyboard('{ArrowDown}{Enter}')
    expect(
      within(chatDialog).getByRole('button', {
        name: /백엔드 기술 연습/,
      }),
    ).toHaveAttribute('aria-expanded', 'false')

    const messageInput = within(chatDialog).getByRole('textbox', {
      name: '메시지 입력',
    })
    await user.type(messageInput, '자료 확인했습니다.{enter}')
    expect(sendStudyGroupChatMessage).toHaveBeenCalledWith(
      expect.anything(),
      myStudyGroups[1].id,
      '자료 확인했습니다.',
    )
    expect(
      within(chatDialog).getByText('자료 확인했습니다.'),
    ).toBeInTheDocument()
  })

  it('바깥 클릭과 Escape로 팝오버를 닫고 그룹톡 트리거로 포커스를 복귀한다', async () => {
    const user = userEvent.setup()
    renderStudyPage()
    await screen.findAllByRole('article', { name: /상세 정보$/ })

    const chatButton = screen.getByRole('button', { name: '그룹톡 열기' })
    await user.click(chatButton)
    const chatDialog = screen.getByRole('dialog')
    const groupTrigger = await within(chatDialog).findByRole('button', {
      name: /금융권 면접 PT 대비/,
    })

    await user.click(groupTrigger)
    expect(
      within(chatDialog).getByRole('listbox', { name: '내 그룹톡' }),
    ).toBeInTheDocument()

    await user.click(
      within(chatDialog).getByRole('textbox', { name: '메시지 입력' }),
    )
    expect(
      within(chatDialog).queryByRole('listbox', { name: '내 그룹톡' }),
    ).not.toBeInTheDocument()

    await user.click(groupTrigger)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      within(chatDialog).queryByRole('listbox', { name: '내 그룹톡' }),
    ).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(chatButton).toHaveFocus()
  })
})

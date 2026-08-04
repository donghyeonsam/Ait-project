import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  StudyChatContext,
  studyChatDefaultValue,
} from '@/app/study-chat-context'
import { Header } from '@/components/layout/Header'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  logout: mocks.logout,
}))

vi.mock('@/lib/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      userId: 1,
      email: 'test@example.com',
      nickname: '테스터',
      role: 'USER',
    },
    signOut: mocks.signOut,
  }),
}))

function CurrentPath() {
  return <span data-testid="current-path">{useLocation().pathname}</span>
}

describe('Header 로그아웃', () => {
  beforeEach(() => {
    mocks.logout.mockReset()
    mocks.signOut.mockReset()
  })

  it('서버 로그아웃이 실패해도 로컬 인증을 정리하고 랜딩페이지로 이동한다', async () => {
    mocks.logout.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Header />
        <CurrentPath />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce())
    expect(screen.getByTestId('current-path')).toHaveTextContent('/')
  })

  it('스터디 하위 페이지에서도 스터디 라운지 메뉴를 활성화한다', () => {
    render(
      <MemoryRouter initialEntries={['/study/groups/101']}>
        <Header />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: '스터디 라운지' }),
    ).toHaveAttribute('aria-current', 'page')
  })
})

describe('Header 그룹톡 버튼', () => {
  it('안읽은 메시지 수를 99+로 축약해 배지와 접근성 라벨로 알리고 클릭 시 모달을 연다', async () => {
    const openChat = vi.fn()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <StudyChatContext.Provider
          value={{ ...studyChatDefaultValue, totalUnread: 120, openChat }}
        >
          <Header />
        </StudyChatContext.Provider>
      </MemoryRouter>,
    )

    const chatButton = screen.getByRole('button', {
      name: '그룹톡 열기, 읽지 않은 메시지 99+개',
    })
    expect(chatButton).toHaveTextContent('99+')

    await user.click(chatButton)
    expect(openChat).toHaveBeenCalledOnce()
  })

  it('안읽은 메시지가 없으면 배지 없이 열기 버튼만 보여준다', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Header />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('button', { name: '그룹톡 열기' }),
    ).toBeInTheDocument()
  })
})

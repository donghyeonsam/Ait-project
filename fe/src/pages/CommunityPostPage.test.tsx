import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deletePost,
  fetchComments,
  fetchPost,
} from '@/api/community'
import { CommunityPostPage } from '@/pages/CommunityPostPage'
import type { CommunityPost } from '@/types/community'

vi.mock('@/api/community', () => ({
  fetchPost: vi.fn(),
  fetchComments: vi.fn(),
  deletePost: vi.fn(),
  toggleBookmark: vi.fn(),
  toggleLike: vi.fn(),
}))

vi.mock('@/lib/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      userId: 1,
      email: 'kim@example.com',
      nickname: '김싸피',
      role: 'USER',
    },
    signOut: vi.fn(),
  }),
}))

const post: CommunityPost = {
  id: 'post-3',
  category: 'tip',
  title: '면접 답변 팁',
  excerpt: '면접 답변 팁을 공유합니다.',
  contentHtml: '<p>면접 답변 팁을 공유합니다.</p>',
  author: '김싸피',
  createdAt: '2026-07-28T10:00:00+09:00',
  tags: ['면접팁'],
  viewCount: 10,
  commentCount: 0,
  likeCount: 2,
  liked: false,
  bookmarked: false,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/community/posts/post-3']}>
      <Routes>
        <Route path="/community/posts/:postId" element={<CommunityPostPage />} />
        <Route path="/community" element={<p>커뮤니티 목록</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CommunityPostPage', () => {
  beforeEach(() => {
    vi.mocked(fetchPost).mockResolvedValue(post)
    vi.mocked(fetchComments).mockResolvedValue([])
    vi.mocked(deletePost).mockResolvedValue()
  })

  it('작성자에게만 수정·삭제 행동을 보여주고 삭제 확인 후 요청한다', async () => {
    const user = userEvent.setup()
    renderPage()

    const editLink = await screen.findByRole('link', { name: '수정' })
    expect(editLink).toHaveAttribute('href', '/community/posts/post-3/edit')

    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(
      screen.getByRole('heading', { name: '게시글을 삭제할까요?' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '게시글 삭제' }))
    await waitFor(() => {
      expect(deletePost).toHaveBeenCalledWith('post-3')
    })
  })

  it('다른 사용자의 게시글에는 관리 행동을 보여주지 않는다', async () => {
    vi.mocked(fetchPost).mockResolvedValue({ ...post, author: '다른사용자' })
    renderPage()

    expect(await screen.findByText('면접 답변 팁')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('헤더와 푸터를 제외한 상세 콘텐츠를 90%로 축소한다', async () => {
    renderPage()

    await screen.findByText('면접 답변 팁')

    expect(screen.getByRole('main').firstElementChild).toHaveClass(
      'page-content-zoom-90',
    )
  })
})

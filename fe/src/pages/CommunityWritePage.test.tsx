import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPost, updatePost } from '@/api/community'
import { CommunityWritePage } from '@/pages/CommunityWritePage'
import type { CommunityPost } from '@/types/community'

vi.mock('@/api/community', () => ({
  createPost: vi.fn(),
  fetchPost: vi.fn(),
  updatePost: vi.fn(),
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

vi.mock('@/components/editor/RichTextEditor', () => ({
  RichTextEditor: ({
    initialContent = '',
    onUpdate,
  }: {
    initialContent?: string
    onUpdate?: (value: { html: string; text: string }) => void
  }) => (
    <textarea
      aria-label="내용"
      defaultValue={initialContent}
      onChange={(event) =>
        onUpdate?.({
          html: `<p>${event.target.value}</p>`,
          text: event.target.value,
        })
      }
    />
  ),
}))

const post: CommunityPost = {
  id: 'post-3',
  category: 'tip',
  title: '기존 게시글 제목',
  excerpt: '기존 게시글 내용입니다.',
  contentHtml: '<p>기존 게시글 내용입니다.</p>',
  author: '김싸피',
  createdAt: '2026-07-28T10:00:00+09:00',
  tags: ['면접팁'],
  viewCount: 10,
  commentCount: 0,
  likeCount: 2,
  liked: false,
  bookmarked: false,
  visibility: 'public',
  allowComments: true,
  notify: true,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/community/posts/post-3/edit']}>
      <Routes>
        <Route
          path="/community/posts/:postId/edit"
          element={<CommunityWritePage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CommunityWritePage edit mode', () => {
  beforeEach(() => {
    vi.mocked(fetchPost).mockResolvedValue(post)
    vi.mocked(updatePost).mockResolvedValue(post)
  })

  it('기존 글을 폼에 채우고 수정된 내용으로 저장한다', async () => {
    const user = userEvent.setup()
    renderPage()

    const titleInput = await screen.findByDisplayValue('기존 게시글 제목')
    expect(screen.getByRole('textbox', { name: '내용' })).toHaveValue(
      post.contentHtml,
    )

    await user.clear(titleInput)
    await user.type(titleInput, '수정된 게시글 제목')
    await user.click(screen.getByRole('button', { name: '수정 완료' }))

    await waitFor(() => {
      expect(updatePost).toHaveBeenCalledWith(
        'post-3',
        expect.objectContaining({
          category: 'tip',
          title: '수정된 게시글 제목',
          contentHtml: post.contentHtml,
        }),
        '김싸피',
      )
    })
  })

  it('작성자가 아니면 수정 폼 대신 접근 안내를 보여준다', async () => {
    vi.mocked(fetchPost).mockResolvedValue({ ...post, author: '다른사용자' })
    renderPage()

    expect(
      await screen.findByText('이 게시글을 수정할 수 없어요.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '수정 완료' }),
    ).not.toBeInTheDocument()
  })
})

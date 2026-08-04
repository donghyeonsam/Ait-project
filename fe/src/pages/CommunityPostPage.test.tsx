import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deletePost,
  downloadPostFile,
  fetchComments,
  fetchPost,
} from '@/api/community'
import { CommunityPostPage } from '@/pages/CommunityPostPage'
import type { CommunityPost } from '@/types/community'

vi.mock('@/api/community', () => ({
  fetchPost: vi.fn(),
  fetchComments: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  deletePost: vi.fn(),
  downloadPostFile: vi.fn(),
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
    vi.mocked(downloadPostFile).mockResolvedValue()
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

  it('게시글과 댓글 작성 시각을 초 단위까지 보여준다', async () => {
    vi.mocked(fetchPost).mockResolvedValue({
      ...post,
      createdAt: '2026-07-28T10:00:05',
    })
    vi.mocked(fetchComments).mockResolvedValue([
      {
        id: 'comment-1',
        authorId: 2,
        author: '댓글작성자',
        createdAt: '2026-07-28T11:02:09',
        content: '초 단위 작성 시각을 확인합니다.',
        likeCount: 0,
        liked: false,
        deleted: false,
        replies: [],
      },
    ])

    renderPage()

    expect(await screen.findByText('2026. 07. 28 10:00:05')).toBeInTheDocument()
    expect(await screen.findByText('2026. 07. 28 11:02:09')).toBeInTheDocument()
  })

  it('댓글을 허용하지 않은 게시글에서는 댓글과 답글 작성 UI를 숨긴다', async () => {
    vi.mocked(fetchPost).mockResolvedValue({ ...post, allowComments: false })
    vi.mocked(fetchComments).mockResolvedValue([
      {
        id: 'comment-1',
        authorId: 2,
        author: '기존작성자',
        createdAt: '2026-07-28T11:00:00+09:00',
        content: '기존 댓글은 계속 조회됩니다.',
        likeCount: 0,
        liked: false,
        deleted: false,
        replies: [],
      },
    ])

    renderPage()

    expect(
      await screen.findByText('이 게시글은 댓글 작성을 허용하지 않습니다.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('기존 댓글은 계속 조회됩니다.')).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: '댓글 등록' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '답글 쓰기' }),
    ).not.toBeInTheDocument()
  })

  it('댓글을 허용하지 않은 게시글에서는 댓글 로딩 스켈레톤을 표시하지 않는다', async () => {
    vi.mocked(fetchPost).mockResolvedValue({ ...post, allowComments: false })
    vi.mocked(fetchComments).mockReturnValue(new Promise(() => {}))

    const { container } = renderPage()

    expect(
      await screen.findByText('이 게시글은 댓글 작성을 허용하지 않습니다.'),
    ).toBeInTheDocument()
    expect(container.querySelector('.analyzing-shimmer')).not.toBeInTheDocument()
  })

  it('첨부파일을 표시하고 인증 다운로드를 요청한다', async () => {
    const user = userEvent.setup()
    const attachment = {
      originalFilename: '면접 자료.pdf',
      storedFilename: 'boards/stored-guide.pdf',
      fileType: 'PDF' as const,
      usageType: 'ATTACHMENT' as const,
      url: '/backend/images/boards/stored-guide.pdf',
    }
    vi.mocked(fetchPost).mockResolvedValue({ ...post, files: [attachment] })

    renderPage()

    expect(await screen.findByRole('heading', { name: '첨부파일' })).toBeInTheDocument()
    expect(screen.getByText('면접 자료.pdf')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: '면접 자료.pdf 다운로드' }),
    )

    expect(downloadPostFile).toHaveBeenCalledWith(attachment)
  })

  it('헤더와 푸터를 제외한 상세 콘텐츠를 90%로 축소한다', async () => {
    renderPage()

    await screen.findByText('면접 답변 팁')

    expect(screen.getByRole('main').firstElementChild).toHaveClass(
      'page-content-zoom-90',
    )
  })
})

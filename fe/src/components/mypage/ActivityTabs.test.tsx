import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMyActivityPosts } from '@/api/community'
import { ActivityTabs } from '@/components/mypage/ActivityTabs'
import type { CommunityPost } from '@/types/community'

vi.mock('@/api/community', () => ({
  fetchMyActivityPosts: vi.fn(),
}))

const post: CommunityPost = {
  id: '11',
  category: 'tip',
  title: '면접 답변 구성 팁',
  excerpt: '답변을 STAR 구조로 정리하는 방법입니다.',
  contentHtml: '',
  author: '김싸피',
  createdAt: '2026-07-30T10:00:00+09:00',
  tags: ['면접팁'],
  viewCount: 10,
  commentCount: 2,
  likeCount: 5,
  liked: false,
  bookmarked: false,
}

function renderTabs() {
  return render(
    <MemoryRouter>
      <ActivityTabs />
    </MemoryRouter>,
  )
}

describe('ActivityTabs', () => {
  beforeEach(() => {
    vi.mocked(fetchMyActivityPosts).mockResolvedValue({
      items: [post],
      hasMore: false,
    })
  })

  it('작성한 게시글을 불러와 상세 페이지 링크로 표시한다', async () => {
    renderTabs()

    const title = await screen.findByText('면접 답변 구성 팁')

    expect(fetchMyActivityPosts).toHaveBeenCalledWith('written')
    expect(title.closest('a')).toHaveAttribute('href', '/community/posts/11')
  })

  it('탭을 바꾸면 선택한 활동 목록을 다시 조회한다', async () => {
    const user = userEvent.setup()
    renderTabs()

    await screen.findByText('면접 답변 구성 팁')
    await user.click(screen.getByRole('tab', { name: '저장한 게시글' }))

    await waitFor(() => {
      expect(fetchMyActivityPosts).toHaveBeenCalledWith('scrapped')
    })
  })

  it('목록 조회에 실패하면 다시 시도할 수 있다', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchMyActivityPosts)
      .mockRejectedValueOnce(new TypeError('network error'))
      .mockResolvedValueOnce({ items: [post], hasMore: false })
    renderTabs()

    expect(
      await screen.findByText('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('면접 답변 구성 팁')).toBeInTheDocument()
    expect(fetchMyActivityPosts).toHaveBeenCalledTimes(2)
  })
})

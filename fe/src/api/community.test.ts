import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPost,
  deletePost,
  fetchPost,
  fetchPosts,
  updatePost,
} from '@/api/community'
import type { CommunityPostDraft } from '@/types/community'

const listItem = {
  id: 11,
  category: '면접 팁',
  title: '면접 답변 구조화 팁',
  contentSummary: '답변을 STAR 구조로 정리하는 방법을 공유합니다.',
  nickname: '김싸피',
  tags: ['면접팁'],
  viewCount: 10,
  commentCount: 2,
  likeCount: 5,
  bookmarked: true,
  liked: false,
  createdAt: '2026-07-30T10:00:00',
}

const pageResponse = (over: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      statusCode: 200,
      message: '게시글 목록 조회 성공',
      data: { content: [listItem], last: false, ...over },
      error: null,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )

const draft: CommunityPostDraft = {
  category: 'tip',
  title: 'CRUD 테스트 게시글',
  contentHtml: '<p>게시글 수정과 삭제 동작을 확인합니다.</p>',
  tags: ['테스트'],
  visibility: 'public',
  allowComments: true,
  notify: true,
}

describe('fetchPosts', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('필터를 쿼리 파라미터로 변환해 목록 엔드포인트를 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pageResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPosts({
      tab: 'popular',
      category: 'tip',
      offset: 6,
      limit: 3,
    })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.pathname).toBe('/backend/api/posts')
    expect(url.searchParams.get('category')).toBe('면접 팁')
    expect(url.searchParams.get('sortType')).toBe('POPULAR')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('size')).toBe('3')

    expect(result.hasMore).toBe(true)
    expect(result.items[0]).toMatchObject({
      id: '11',
      category: 'tip',
      title: '면접 답변 구조화 팁',
      excerpt: '답변을 STAR 구조로 정리하는 방법을 공유합니다.',
      author: '김싸피',
      bookmarked: true,
      liked: false,
    })
  })

  it('전체 카테고리·최신 탭이면 category 없이 LATEST로 조회한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pageResponse({ last: true }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPosts({
      tab: 'latest',
      category: 'all',
      offset: 0,
      limit: 3,
    })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.searchParams.has('category')).toBe(false)
    expect(url.searchParams.get('sortType')).toBe('LATEST')
    expect(result.hasMore).toBe(false)
  })
})

describe('community mock CRUD', () => {
  it('로그인 사용자의 게시글을 생성·수정·조회·삭제한다', async () => {
    const created = await createPost(draft, '테스트사용자')

    const updated = await updatePost(
      created.id,
      {
        ...draft,
        title: '수정된 CRUD 테스트 게시글',
        contentHtml: '<p>수정된 게시글 내용입니다.</p>',
      },
      '테스트사용자',
    )

    expect(updated.title).toBe('수정된 CRUD 테스트 게시글')
    await expect(fetchPost(created.id)).resolves.toMatchObject({
      title: '수정된 CRUD 테스트 게시글',
      author: '테스트사용자',
    })

    await deletePost(created.id, '테스트사용자')
    await expect(fetchPost(created.id)).resolves.toBeNull()
  })

  it('작성자가 아닌 사용자의 수정과 삭제를 거부한다', async () => {
    await expect(
      updatePost('post-2', draft, '김싸피'),
    ).rejects.toThrow('수정할 권한이 없습니다.')
    await expect(
      deletePost('post-2', '김싸피'),
    ).rejects.toThrow('삭제할 권한이 없습니다.')
  })
})

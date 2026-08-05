import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPost,
  deletePost,
  downloadPostFile,
  fetchComments,
  fetchMyActivityPosts,
  fetchPost,
  fetchPosts,
  fetchTrendingKeywords,
  toggleBookmark,
  toggleCommentLike,
  toggleLike,
  updatePost,
  uploadPostFile,
  uploadPostFiles,
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
  thumbnailUrl: 'stored-thumb 1.png',
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
  files: [
    {
      originalFilename: 'guide.pdf',
      storedFilename: 'stored-guide.pdf',
      fileType: 'PDF',
      usageType: 'ATTACHMENT',
      url: '/backend/images/stored-guide.pdf',
    },
  ],
  thumbnail: null,
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

  it('목록의 썸네일 저장 파일명을 이미지 URL로 조립한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pageResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPosts({
      tab: 'latest',
      category: 'all',
      offset: 0,
      limit: 3,
    })

    expect(result.items[0]?.thumbnail).toBe(
      'https://i15d202.p.ssafy.io/download/stored-thumb%201.png',
    )
  })

  it('썸네일이 없는 게시글은 thumbnail을 null로 둔다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      pageResponse({ content: [{ ...listItem, thumbnailUrl: null }] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPosts({
      tab: 'latest',
      category: 'all',
      offset: 0,
      limit: 3,
    })

    expect(result.items[0]?.thumbnail).toBeNull()
  })

  it('제목+내용 검색어를 다듬어 keyword 파라미터로 전달한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pageResponse())
    vi.stubGlobal('fetch', fetchMock)

    await fetchPosts({
      tab: 'latest',
      category: 'all',
      offset: 0,
      limit: 3,
      query: '  카카오 면접  ',
      searchTargets: { titleContent: true, tags: false },
    })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.searchParams.get('keyword')).toBe('카카오 면접')
    expect(url.searchParams.has('tag')).toBe(false)
  })

  it('태그만 선택하면 tag 파라미터만 전달한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pageResponse())
    vi.stubGlobal('fetch', fetchMock)

    await fetchPosts({
      tab: 'latest',
      category: 'all',
      offset: 0,
      limit: 3,
      query: '삼성전자',
      searchTargets: { titleContent: false, tags: true },
    })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.searchParams.has('keyword')).toBe(false)
    expect(url.searchParams.get('tag')).toBe('삼성전자')
  })

  it('제목+내용과 태그를 모두 선택하면 같은 검색어를 두 파라미터로 전달한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pageResponse())
    vi.stubGlobal('fetch', fetchMock)

    await fetchPosts({
      tab: 'latest',
      category: 'all',
      offset: 0,
      limit: 3,
      query: '삼성전자',
      searchTargets: { titleContent: true, tags: true },
    })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.searchParams.get('keyword')).toBe('삼성전자')
    expect(url.searchParams.get('tag')).toBe('삼성전자')
  })

  it('검색 범위를 모두 해제하면 백엔드를 조회하지 않고 빈 결과를 반환한다', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchPosts({
        tab: 'latest',
        category: 'all',
        offset: 0,
        limit: 3,
        query: '삼성전자',
        searchTargets: { titleContent: false, tags: false },
      }),
    ).resolves.toEqual({ items: [], hasMore: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('빈 검색어는 keyword 파라미터를 보내지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pageResponse())
    vi.stubGlobal('fetch', fetchMock)

    await fetchPosts({
      tab: 'latest',
      category: 'all',
      offset: 0,
      limit: 3,
      query: '   ',
      searchTargets: { titleContent: true, tags: true },
    })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.searchParams.has('keyword')).toBe(false)
    expect(url.searchParams.has('tag')).toBe(false)
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

  it('요약의 HTML 태그를 제거해 excerpt로 만든다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      pageResponse({
        content: [
          {
            ...listItem,
            contentSummary: '<p>게시글 테스트입니다.&nbsp;수정합니다</p><p></',
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPosts({
      tab: 'latest',
      category: 'all',
      offset: 0,
      limit: 3,
    })

    expect(result.items[0]?.excerpt).toBe('게시글 테스트입니다. 수정합니다')
  })
})

describe('fetchTrendingKeywords', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('주간 인기 태그를 조회하고 응답 순서대로 순위를 만든다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          message: '주간 인기 태그 Top 10 조회 성공',
          data: ['기술면접', '모의면접', '취업준비'],
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchTrendingKeywords()).resolves.toEqual([
      { rank: 1, keyword: '기술면접' },
      { rank: 2, keyword: '모의면접' },
      { rank: 3, keyword: '취업준비' },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      '/backend/api/tags/trending',
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})

describe('fetchMyActivityPosts', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['written', '/backend/api/users/me/post'],
    ['scrapped', '/backend/api/users/me/post/scrap'],
    ['liked', '/backend/api/users/me/post/like'],
  ] as const)('%s 활동을 유저별로 필터링된 전용 엔드포인트로 조회한다', async (activity, expectedPath) => {
    const fetchMock = vi.fn().mockResolvedValue(pageResponse({ last: true }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMyActivityPosts(activity)

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.pathname).toBe(expectedPath)
    expect(url.searchParams.get('page')).toBe('0')
    expect(url.searchParams.get('size')).toBe('10')
    expect(result.items[0]?.id).toBe('11')
  })
})

describe('fetchPost', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('상세 응답을 화면 모델로 매핑한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          message: '게시글 상세 조회 성공',
          data: {
            id: 11,
            userId: 1,
            nickname: '김싸피',
            category: '면접 팁',
            title: '면접 답변 구조화 팁',
            content: '<p>답변을 STAR 구조로 정리하는 방법을 공유합니다.</p>',
            allowComments: true,
            receiveNotifications: false,
            likeCount: 5,
            viewCount: 10,
            liked: true,
            scrapped: true,
            tags: ['면접팁'],
            files: [
              {
                id: 1,
                originalFilename: 'guide.pdf',
                storedFilename: 'boards/stored-guide.pdf',
                fileType: 'PDF',
                usageType: 'ATTACHMENT',
              },
            ],
            createdAt: '2026-07-30T10:00:00',
            updatedAt: '2026-07-30T10:00:00',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const post = await fetchPost('11')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/posts/11')
    expect(post).toMatchObject({
      id: '11',
      category: 'tip',
      title: '면접 답변 구조화 팁',
      contentHtml: '<p>답변을 STAR 구조로 정리하는 방법을 공유합니다.</p>',
      excerpt: '답변을 STAR 구조로 정리하는 방법을 공유합니다.',
      author: '김싸피',
      allowComments: true,
      notify: false,
      liked: true,
      bookmarked: true,
      files: [
        expect.objectContaining({
          id: 1,
          originalFilename: 'guide.pdf',
          storedFilename: 'boards/stored-guide.pdf',
          fileType: 'PDF',
          usageType: 'ATTACHMENT',
          url: 'https://i15d202.p.ssafy.io/download/boards/stored-guide.pdf',
        }),
      ],
    })
  })

  it('존재하지 않는 게시글이면 null을 돌려준다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 404,
          message: '게시글을 찾을 수 없습니다.',
          data: null,
          error: { code: 'COMMUNITY_001' },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchPost('999')).resolves.toBeNull()
  })
})

describe('fetchComments', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('페이지네이션 응답의 comments를 화면 모델로 변환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          message: '댓글 목록 조회 성공',
          data: {
            comments: [
              {
                id: 7,
                parentId: null,
                userId: 2,
                nickname: '댓글작성자',
                content: '원댓글입니다.',
                likeCount: 3,
                liked: true,
                createdAt: '2026-08-04T10:00:00',
                deletedAt: null,
                replies: [
                  {
                    id: 8,
                    parentId: 7,
                    userId: 3,
                    nickname: '답글작성자',
                    content: '답글입니다.',
                    likeCount: 0,
                    liked: false,
                    createdAt: '2026-08-04T10:01:00',
                    deletedAt: null,
                    replies: [],
                  },
                ],
              },
            ],
            hasNext: false,
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchComments('11')).resolves.toEqual([
      {
        id: '7',
        authorId: 2,
        author: '댓글작성자',
        createdAt: '2026-08-04T10:00:00',
        content: '원댓글입니다.',
        likeCount: 3,
        liked: true,
        deleted: false,
        replies: [
          {
            id: '8',
            authorId: 3,
            author: '답글작성자',
            createdAt: '2026-08-04T10:01:00',
            content: '답글입니다.',
            likeCount: 0,
            liked: false,
            deleted: false,
          },
        ],
      },
    ])
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/posts/11/comments')
  })
})

describe('createPost', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('작성 폼 값을 생성 요청 본문으로 변환해 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 201,
          message: '게시글 작성 성공',
          data: 42,
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const postId = await createPost(draft)

    expect(postId).toBe('42')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/posts')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      category: '면접 팁',
      title: 'CRUD 테스트 게시글',
      content: '<p>게시글 수정과 삭제 동작을 확인합니다.</p>',
      thumbnail: null,
      allowComments: true,
      receiveNotifications: true,
      tags: ['테스트'],
      files: [
        {
          originalFilename: 'guide.pdf',
          storedFilename: 'stored-guide.pdf',
          fileType: 'PDF',
          usageType: 'ATTACHMENT',
        },
      ],
    })
  })
})

describe('post file upload', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('uploads an inline image as multipart data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 201,
          message: '파일 업로드 성공',
          data: 'boards/stored-image.png',
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['image'], 'profile.png', { type: 'image/png' })

    const result = await uploadPostFile(file, 'INLINE')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/files/upload')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('file')).toBe(file)
    expect(result).toEqual({
      originalFilename: 'profile.png',
      storedFilename: 'boards/stored-image.png',
      fileType: 'IMAGE',
      usageType: 'INLINE',
      url: 'https://i15d202.p.ssafy.io/download/boards/stored-image.png',
    })
  })

  it('uploads attachments in one multipart request and preserves order', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 201,
          message: '파일 업로드 성공',
          data: ['boards/stored-guide.pdf', 'boards/stored-note.txt'],
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const files = [
      new File(['pdf'], 'guide.pdf', { type: 'application/pdf' }),
      new File(['text'], 'note.txt', { type: 'text/plain' }),
    ]

    const result = await uploadPostFiles(files, 'ATTACHMENT')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/files/uploads')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect((init.body as FormData).getAll('files')).toEqual(files)
    expect(result.map(({ fileType, usageType }) => ({ fileType, usageType }))).toEqual([
      { fileType: 'PDF', usageType: 'ATTACHMENT' },
      { fileType: 'OTHER', usageType: 'ATTACHMENT' },
    ])
    expect(result.map((file) => file.url)).toEqual([
      'https://i15d202.p.ssafy.io/download/boards/stored-guide.pdf',
      'https://i15d202.p.ssafy.io/download/boards/stored-note.txt',
    ])
  })

  it('보호된 첨부파일을 원본 파일명으로 다운로드한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['pdf'], { type: 'application/pdf' }), {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:attachment')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
    let downloadedFilename = ''
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download
      })

    await downloadPostFile({
      originalFilename: '면접 자료.pdf',
      storedFilename: 'boards/stored-guide.pdf',
      fileType: 'PDF',
      usageType: 'ATTACHMENT',
      url: '/backend/images/boards/stored-guide.pdf',
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/images/boards/stored-guide.pdf',
    )
    expect(downloadedFilename).toBe('면접 자료.pdf')
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:attachment')
  })
})

describe('updatePost', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('수정 폼 값을 요청 본문으로 변환해 수정 엔드포인트를 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          message: '게시글 수정 성공',
          data: null,
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await updatePost('11', { ...draft, title: '수정된 제목' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/posts/11')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('PUT')
    expect(JSON.parse(String(init.body))).toMatchObject({
      category: '면접 팁',
      title: '수정된 제목',
      content: '<p>게시글 수정과 삭제 동작을 확인합니다.</p>',
    })
  })
})

describe('deletePost', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('삭제 엔드포인트를 DELETE 메서드로 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          message: '게시글 삭제 성공',
          data: null,
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await deletePost('11')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/posts/11')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('DELETE')
  })
})

const interactionResponse = (status: number, message: string) =>
  new Response(
    JSON.stringify({
      statusCode: status,
      message,
      data: null,
      error: status >= 400 ? { code: 'COMMUNITY_XXX' } : null,
    }),
    { status, headers: { 'content-type': 'application/json' } },
  )

describe('toggleLike / toggleBookmark', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('좋아요 등록은 POST, 취소는 DELETE로 호출한다', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(interactionResponse(200, '좋아요 등록 성공')),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(toggleLike('11', true)).resolves.toBe(true)
    await expect(toggleLike('11', false)).resolves.toBe(false)

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/posts/11/likes')
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('POST')
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe('DELETE')
  })

  it('저장 등록·취소는 scraps 엔드포인트를 호출한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(interactionResponse(200, '스크랩 등록 성공'))
    vi.stubGlobal('fetch', fetchMock)

    await toggleBookmark('11', true)

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/posts/11/scraps')
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('POST')
  })

  it('이미 등록(409)·이미 취소(404)된 상태는 성공으로 간주한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(interactionResponse(409, '이미 좋아요를 누른 게시글입니다.'))
      .mockResolvedValueOnce(interactionResponse(404, '스크랩 내역을 찾을 수 없습니다.'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(toggleLike('11', true)).resolves.toBe(true)
    await expect(toggleBookmark('11', false)).resolves.toBe(false)
  })

  it('그 밖의 오류는 그대로 던진다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(interactionResponse(500, '서버 오류'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(toggleLike('11', true)).rejects.toThrow('서버 오류')
  })

  it('댓글 좋아요는 comments 경로로 호출하고 409/404는 성공으로 본다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(interactionResponse(200, '댓글 좋아요 등록 성공'))
      .mockResolvedValueOnce(interactionResponse(409, '이미 좋아요를 누른 댓글입니다.'))
      .mockResolvedValueOnce(interactionResponse(404, '좋아요 내역을 찾을 수 없습니다.'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(toggleCommentLike('7', true)).resolves.toBe(true)
    await expect(toggleCommentLike('7', true)).resolves.toBe(true)
    await expect(toggleCommentLike('7', false)).resolves.toBe(false)

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/comments/7/likes')
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('POST')
    expect((fetchMock.mock.calls[2]?.[1] as RequestInit).method).toBe('DELETE')
  })
})

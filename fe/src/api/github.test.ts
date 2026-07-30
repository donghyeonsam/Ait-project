import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteGithubRepo, updateGithubRepoNickname } from '@/api/github'

describe('updateGithubRepoNickname', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('레포지토리 표시 이름 수정 엔드포인트를 PATCH로 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          timestamp: '2026-07-30T00:00:00Z',
          path: '/api/github/repos/3',
          message: '레포지토리 닉네임이 성공적으로 수정되었습니다.',
          data: null,
          error: null,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await updateGithubRepoNickname(3, '포트폴리오 레포')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/github/repos/3')

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.method).toBe('PATCH')
    expect(JSON.parse(request.body as string)).toEqual({
      repoNickname: '포트폴리오 레포',
    })
  })
})

describe('deleteGithubRepo', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('레포지토리 연동 삭제 엔드포인트를 DELETE로 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          timestamp: '2026-07-30T00:00:00Z',
          path: '/api/github/repos/3',
          message: '레포지토리가 삭제되었습니다.',
          data: null,
          error: null,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await deleteGithubRepo(3)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/github/repos/3')

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.method).toBe('DELETE')
  })
})

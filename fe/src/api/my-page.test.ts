import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyGithubRepositories } from '@/api/github'
import { getMyPageRepositories } from '@/api/my-page'

vi.mock('@/api/github', () => ({
  getMyGithubRepositories: vi.fn(),
}))

describe('getMyPageRepositories', () => {
  beforeEach(() => {
    vi.mocked(getMyGithubRepositories).mockResolvedValue([])
  })

  it('저장소 목록을 반환한다', async () => {
    const result = await getMyPageRepositories()

    expect(result.repositories).toEqual([])
    expect(result.repositoryError).toBeNull()
  })

  it('조회가 실패하면 repositories는 빈 배열, repositoryError에 메시지를 담는다', async () => {
    vi.mocked(getMyGithubRepositories).mockRejectedValue(new TypeError('network'))

    const result = await getMyPageRepositories()

    expect(result.repositories).toEqual([])
    expect(result.repositoryError).toContain('서버에 연결할 수 없습니다')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyGithubRepositories } from '@/api/github'
import { getMyPageData } from '@/api/my-page'
import { getMyResume, type Resume } from '@/api/resume'

vi.mock('@/api/github', () => ({
  getMyGithubRepositories: vi.fn(),
}))

vi.mock('@/api/resume', () => ({
  getMyResume: vi.fn(),
}))

const resume: Resume = {
  resumeId: 1,
  userId: 1,
  userName: '테스터',
  analysisContent: null,
  createdAt: '2026-07-23T00:00:00Z',
  updatedAt: null,
  trainings: [],
  projects: [],
  careers: [],
}

describe('getMyPageData', () => {
  beforeEach(() => {
    vi.mocked(getMyResume).mockResolvedValue(resume)
    vi.mocked(getMyGithubRepositories).mockResolvedValue([])
  })

  it('GitHub 조회가 실패해도 이력서 데이터는 반환한다', async () => {
    vi.mocked(getMyGithubRepositories).mockRejectedValue(new TypeError('network'))

    const result = await getMyPageData()

    expect(result.resume).toEqual(resume)
    expect(result.repositories).toEqual([])
    expect(result.repositoryError).toContain('서버에 연결할 수 없습니다')
  })

  it('이력서 조회가 실패하면 전체 조회를 실패 처리한다', async () => {
    vi.mocked(getMyResume).mockRejectedValue(new Error('resume failed'))

    await expect(getMyPageData()).rejects.toThrow('resume failed')
  })
})

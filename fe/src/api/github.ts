// GitHub 저장소 목록 조회·표시 이름 수정과 App 설치 확정 API 호출을 담은 모듈.
import { backendRequest } from '@/api/http'

export interface GithubRepository {
  githubRepoId: number
  name: string
  nickname: string
  url: string
  isPrivate: boolean
  updatedAt: string | null
}

export function getMyGithubRepositories() {
  return backendRequest<GithubRepository[]>('/api/github/repos')
}

export function confirmGithubInstallation(installationId: string) {
  return backendRequest<void>(
    `/api/github/callback?installation_id=${encodeURIComponent(installationId)}`,
  )
}

export function updateGithubRepoNickname(repoId: number, repoNickname: string) {
  return backendRequest<void>(`/api/github/repos/${repoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ repoNickname }),
  })
}

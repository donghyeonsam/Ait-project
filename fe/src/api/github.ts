// GitHub 저장소 목록 조회와 App 설치 확정 API 호출을 담은 모듈.
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

export function updateGithubRepositoryNickname(
  repositoryId: number,
  repoNickname: string,
) {
  return backendRequest<void>(`/api/github/repos/${repositoryId}`, {
    method: 'PATCH',
    body: JSON.stringify({ repoNickname }),
  })
}

export function deleteGithubRepository(repositoryId: number) {
  return backendRequest<void>(`/api/github/repos/${repositoryId}`, {
    method: 'DELETE',
  })
}

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

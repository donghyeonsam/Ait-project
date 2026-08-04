import { getMyGithubRepositories, type GithubRepository } from '@/api/github'
import { backendRequest, toErrorMessage } from '@/api/http'

export interface MyPageRepositoriesResult {
  repositories: GithubRepository[]
  repositoryError: string | null
}

// 마이페이지의 깃허브 저장소 목록을 조회한다. 실패해도 페이지 전체를 막지 않고 repositoryError로 넘긴다.
export async function getMyPageRepositories(): Promise<MyPageRepositoriesResult> {
  try {
    return { repositories: await getMyGithubRepositories(), repositoryError: null }
  } catch (error) {
    return { repositories: [], repositoryError: toErrorMessage(error) }
  }
}

export interface MyPageGithubRepository {
  githubRepoId: number
  repoNickname: string
  repoUrl: string
}

export interface MyPageProfile {
  userId: number
  name: string
  nickname: string
  email: string
  firstJobInterest: string | null
  secondJobInterest: string | null
  profileImageUrl: string | null
  skills: string[]
  githubUsername: string | null
  githubUrl: string | null
  githubRepositories: MyPageGithubRepository[]
}

// 이름·닉네임·이메일·관심 직무·기술 스택·깃허브 연동을 한 번에 조회한다.
export function getMyPageProfile() {
  return backendRequest<MyPageProfile>('/api/users/me')
}

export interface MyPageUpdatePayload {
  nickname: string
  name: string
  firstJobInterest: string | null
  secondJobInterest: string | null
  skills: string[]
  githubRepositories: Array<{ githubRepoId: number; repoNickname: string }>
}

// 내 정보를 통합 수정한다. 닉네임이 다른 사용자와 겹치면 409(AUTH_002)로 실패한다.
export function updateMyPageProfile(payload: MyPageUpdatePayload, profileImage?: File | null) {
  const formData = new FormData()
  formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (profileImage) formData.append('profileImage', profileImage)

  return backendRequest<MyPageProfile>('/api/users/me', {
    method: 'PUT',
    body: formData,
  })
}

export interface NicknameCheckResult {
  canUse: boolean
}

// 닉네임 사용 가능 여부를 조회한다. 본인이 현재 쓰는 닉네임을 그대로 조회해도 자기 자신을
// 제외하지 않아 항상 false로 나오니, 호출 전에 값이 실제로 바뀌었는지 먼저 확인해야 한다.
export function checkNicknameAvailability(nickname: string) {
  return backendRequest<NicknameCheckResult>(
    `/api/users/nickname/check?nickname=${encodeURIComponent(nickname)}`,
  )
}

export interface ProfileRepository {
  id: number
  name: string
  url: string
}

export interface ProfileData {
  name: string
  nickname: string
  email: string
  github: string
  roles: string[]
  repositories: ProfileRepository[]
  skills: string[]
  /** 사용자가 로컬에서 선택한 미리보기 이미지. 실제 업로드 연동 전까지는 세션에만 유지된다. */
  avatarUrl?: string | null
}

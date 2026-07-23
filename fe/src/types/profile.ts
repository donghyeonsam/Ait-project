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
}

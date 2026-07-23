import { backendRequest } from '@/api/http'

export interface InterviewCoverLetter {
  id: number
  title: string
  companyName: string
  updatedAt: string
}

export interface InterviewGithubRepository {
  id: number
  repoName: string
  repoNickname: string
  createdAt: string
}

export interface InterviewPreparation {
  userId: number
  coverLetters: InterviewCoverLetter[]
  githubRepositories: InterviewGithubRepository[]
}

export function getInterviewPreparation() {
  return backendRequest<InterviewPreparation>('/api/ai-interviews')
}

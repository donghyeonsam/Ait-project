// 이력서 조회·수정 API 호출과 관련 타입을 모아둔 모듈.
import { backendRequest } from '@/api/http'

export interface ResumeTraining {
  trainingId: number
  startDate: string
  endDate: string
  organization: string
  course: string
  description: string
}

export interface ResumeProject {
  projectId: number
  projectName: string
  techStacks: string
  role: string
  description: string
}

export interface ResumeCareer {
  careerId: number
  startDate: string
  endDate: string | null
  companyName: string
  role: string
  description: string
}

export interface Resume {
  resumeId: number
  userId: number
  userName: string
  analysisContent: string | null
  createdAt: string
  updatedAt: string | null
  trainings: ResumeTraining[]
  projects: ResumeProject[]
  careers: ResumeCareer[]
}

export interface ResumeUpdateRequest {
  trainings: Array<Omit<ResumeTraining, 'trainingId'>>
  projects: Array<Omit<ResumeProject, 'projectId'>>
  careers: Array<Omit<ResumeCareer, 'careerId'>>
}

export function getMyResume() {
  return backendRequest<Resume>('/api/resumes/me')
}

export function updateResume(resumeId: number, request: ResumeUpdateRequest) {
  return backendRequest<Resume>(`/api/resumes/${resumeId}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

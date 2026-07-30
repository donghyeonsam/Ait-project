// 자기소개서 조회·생성·수정·삭제 API 호출과 관련 타입을 모아둔 모듈.
import { backendRequest } from '@/api/http'

export interface CoverLetterListItem {
  coverLetterId: number
  title: string
  companyName: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface CoverLetterList {
  coverLetters: CoverLetterListItem[]
  totalCount: number
}

export interface CoverLetterContent {
  contentId: number
  contentOrder: number
  question: string
  answer: string
}

export interface CoverLetterDetail {
  coverLetterId: number
  title: string
  companyName: string
  role: string
  analysisContent: string | null
  coverLetterContents: CoverLetterContent[]
  createdAt: string
  updatedAt: string
}

export interface CoverLetterUpdateRequest {
  title: string
  companyName: string
  role: string
  coverLetterContents: Array<{
    contentOrder: number
    question: string
    answer: string
  }>
}

export type CoverLetterCreateRequest = CoverLetterUpdateRequest

export function getMyCoverLetters() {
  return backendRequest<CoverLetterList>('/api/cover-letters/me')
}

export function createCoverLetter(request: CoverLetterCreateRequest) {
  return backendRequest<CoverLetterDetail>('/api/cover-letters', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function getCoverLetter(coverLetterId: number) {
  return backendRequest<CoverLetterDetail>(`/api/cover-letters/${coverLetterId}`)
}

export function updateCoverLetter(
  coverLetterId: number,
  request: CoverLetterUpdateRequest,
) {
  return backendRequest<CoverLetterDetail>(`/api/cover-letters/${coverLetterId}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

// 서버는 논리 삭제로 처리하며, 본인 소유가 아니면 조회 단계에서 404로 걸러진다.
export function deleteCoverLetter(coverLetterId: number) {
  return backendRequest<void>(`/api/cover-letters/${coverLetterId}`, {
    method: 'DELETE',
  })
}

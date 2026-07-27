// 자기소개서 조회·생성·수정 API 호출과 관련 타입을 모아둔 모듈.
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

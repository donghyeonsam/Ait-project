// 스터디 그룹 목록·상세·생성과 내 스터디 조회 API 호출과 관련 타입을 모아둔 모듈.
import { backendRequest } from '@/api/http'

export type StudyGroupStatus = 'RECRUITING' | 'ACTIVE' | 'CLOSED'

export interface StudyGroupListItem {
  id: number
  title: string
  description: string
  capacity: number
  groupStatus: StudyGroupStatus
  createdAt: string
}

export interface StudyGroupPage {
  content: StudyGroupListItem[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  empty: boolean
}

export interface StudyGroupMemberInfo {
  userId: number
  name: string
  profileImageUrl: string | null
  owner: boolean
}

export interface StudyGroupDetail {
  groupId: number
  title: string
  description: string
  currentMemberCount: number
  capacity: number
  createdAt: string
  ownerId: number
  members: StudyGroupMemberInfo[]
}

export interface MyStudyGroup {
  id: number
  title: string
  description: string
  capacity: number
  currentMemberCount: number
  groupStatus: StudyGroupStatus
  joinedAt: string
}

// 백엔드 생성 스펙은 제목과 소개만 받는다. 정원·직군은 아직 서버에 저장할 곳이 없다.
export interface StudyGroupCreateRequest {
  title: string
  description: string
}

export interface StudyGroupQuery {
  status?: StudyGroupStatus
  keyword?: string
  page?: number
  size?: number
}

export function getStudyGroups({ status, keyword, page, size }: StudyGroupQuery = {}) {
  const searchParams = new URLSearchParams()
  if (status) searchParams.set('status', status)
  if (keyword) searchParams.set('keyword', keyword)
  if (page !== undefined) searchParams.set('page', String(page))
  if (size !== undefined) searchParams.set('size', String(size))

  const query = searchParams.toString()
  return backendRequest<StudyGroupPage>(
    `/api/study-groups${query ? `?${query}` : ''}`,
  )
}

export function createStudyGroup(request: StudyGroupCreateRequest) {
  return backendRequest<number>('/api/study-groups', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function getStudyGroupDetail(groupId: number) {
  return backendRequest<StudyGroupDetail>(`/api/study-groups/${groupId}`)
}

export function getMyStudyGroups() {
  return backendRequest<MyStudyGroup[]>('/api/study-groups/me/all')
}

export function getMyActiveStudyGroups() {
  return backendRequest<MyStudyGroup[]>('/api/study-groups/me/active')
}

export function leaveStudyGroup(groupId: number) {
  return backendRequest<void>(`/api/study-groups/${groupId}/leave`, {
    method: 'DELETE',
  })
}

export function updateStudyGroupStatus(
  groupId: number,
  status: StudyGroupStatus,
) {
  return backendRequest<void>(`/api/study-groups/${groupId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

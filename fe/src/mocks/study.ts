import type { CoverLetterListItem } from '@/api/cover-letters'

// TODO: 실제 API 연동 필요 — 서류함 API(getMyCoverLetters, /api/cover-letters/me)로 교체.
// 값은 be/src/main/resources/data.sql의 홍길동(user_id=1) 더미 자소서 4건과 맞춰뒀다.
export const mockPrejoinCoverLetters: CoverLetterListItem[] = [
  {
    coverLetterId: 1,
    title: '삼성전자 DX 부문 자기소개서',
    companyName: '삼성전자',
    role: '백엔드 개발자',
    createdAt: '2026-07-10T13:20:00',
    updatedAt: '2026-07-15T18:30:00',
  },
  {
    coverLetterId: 2,
    title: '카카오 백엔드 개발자 자기소개서',
    companyName: '카카오',
    role: '서버 개발자',
    createdAt: '2026-07-11T10:05:00',
    updatedAt: '2026-07-16T09:15:00',
  },
  {
    coverLetterId: 3,
    title: '네이버 신입 개발자 자기소개서',
    companyName: '네이버',
    role: '백엔드 개발자',
    createdAt: '2026-07-12T11:40:00',
    updatedAt: '2026-07-18T20:05:00',
  },
  {
    coverLetterId: 4,
    title: '토스 서버 개발자 자기소개서',
    companyName: '비바리퍼블리카',
    role: 'Server Developer',
    createdAt: '2026-07-13T15:30:00',
    updatedAt: '2026-07-19T08:45:00',
  },
]

// TODO: 실제 API 연동 필요 — 스터디 라운지/내 스터디 그룹에서 선택한 세션 정보로 교체.
export const mockPrejoinSessionTitle = '금융권 면접 PT 대비'

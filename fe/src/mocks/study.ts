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

export interface StudyParticipant {
  participantId: number
  name: string
  isSelf: boolean
  resumeSummary: string
  /** 서류함에서 쓰는 것과 같은 자소서 제목. 목록 행에 이 제목만 짧게 보여준다. */
  coverLetterTitle: string
  coverLetterSummary: string
}

// TODO: 실제 API 연동 필요 — 세션 참가자 목록(WebRTC 룸 멤버)으로 교체.
export const mockStudyParticipants: StudyParticipant[] = [
  {
    participantId: 0,
    name: '나',
    isSelf: true,
    resumeSummary: '내가 선택한 이력서가 여기에 표시됩니다.',
    coverLetterTitle: '선택한 자소서',
    coverLetterSummary: '내가 선택한 자소서가 여기에 표시됩니다.',
  },
  {
    participantId: 1,
    name: '김싸피',
    isSelf: false,
    resumeSummary: 'Java·Spring Boot 기반 백엔드 프로젝트 3건, REST API 설계와 JWT 인증 구현 경험.',
    coverLetterTitle: '삼성전자 DX 부문 자기소개서',
    coverLetterSummary: '삼성전자 DX 부문 지원, 안정적인 백엔드 시스템 개발을 목표로 지원한 자기소개서.',
  },
  {
    participantId: 2,
    name: '이싸피',
    isSelf: false,
    resumeSummary: 'React·TypeScript 기반 프론트엔드 프로젝트 경험, 디자인 시스템 구축 경험 보유.',
    coverLetterTitle: '카카오 프론트엔드 개발자 자기소개서',
    coverLetterSummary: '카카오 프론트엔드 개발자 지원, 사용자 경험 개선 사례를 중심으로 작성한 자기소개서.',
  },
  {
    participantId: 3,
    name: '박싸피',
    isSelf: false,
    resumeSummary: 'AI/ML 프로젝트 2건, 데이터 전처리와 모델 서빙 파이프라인 구축 경험.',
    coverLetterTitle: '네이버 AI 개발자 자기소개서',
    coverLetterSummary: '네이버 AI 개발자 지원, 모델 성능 개선 경험을 중심으로 작성한 자기소개서.',
  },
  {
    participantId: 4,
    name: '최싸피',
    isSelf: false,
    resumeSummary: '인프라·DevOps 경험 중심, Docker·Kubernetes 기반 배포 자동화 구축 경험.',
    coverLetterTitle: '토스 서버 개발자 자기소개서',
    coverLetterSummary: '토스 서버 개발자 지원, 안정적인 서비스 운영 경험을 중심으로 작성한 자기소개서.',
  },
  {
    participantId: 5,
    name: '정싸피',
    isSelf: false,
    resumeSummary: 'QA 자동화 프로젝트 경험, 테스트 커버리지 개선과 회귀 테스트 체계 구축.',
    coverLetterTitle: '쿠팡 QA 엔지니어 자기소개서',
    coverLetterSummary: '쿠팡 QA 엔지니어 지원, 품질 관리 프로세스 개선 경험을 중심으로 작성한 자기소개서.',
  },
  {
    participantId: 6,
    name: '한싸피',
    isSelf: false,
    resumeSummary: '모바일 앱 프로젝트 2건, Flutter 기반 크로스플랫폼 개발 경험.',
    coverLetterTitle: '당근마켓 모바일 개발자 자기소개서',
    coverLetterSummary: '당근마켓 모바일 개발자 지원, 사용자 리텐션 개선 경험을 중심으로 작성한 자기소개서.',
  },
  {
    participantId: 7,
    name: '오싸피',
    isSelf: false,
    resumeSummary: '보안 동아리 활동, 웹 취약점 진단과 모의 침투 테스트 프로젝트 경험.',
    coverLetterTitle: '라인 보안 엔지니어 자기소개서',
    coverLetterSummary: '라인 보안 엔지니어 지원, 취약점 대응 경험을 중심으로 작성한 자기소개서.',
  },
]

// 스터디 평가탭의 평가 항목. AI 모의면접 리포트 항목(docs/domain-rules.md)과 동일하게 맞춘다.
export const studyEvaluationCategories = [
  '논리력',
  '표현력',
  '순발력',
  '태도',
  '직무 전문성',
  '자신감',
] as const

export type StudyEvaluationCategory = (typeof studyEvaluationCategories)[number]

export type StudyRole =
  | '프론트엔드'
  | '백엔드'
  | 'AI'
  | '서버'
  | 'DATA'
  | 'INFRA'
  | 'PM/PO'
  | 'PT면접'
  | '인성면접'

export type RecruitmentStatus = '모집 중' | '마감 임박' | '신청 대기' | '마감'

export interface StudyCardData {
  id: number
  role: StudyRole
  badgeLabel?: string
  company?: string
  title: string
  description: string
  recruitmentStatus: RecruitmentStatus
  currentMembers: number
  capacity: number
  membersLabel?: string
  createdOrder: number
  schedule: string[]
  activities: string[]
}

export interface MyStudyData {
  id: number
  title: string
  description: string
  role: '그룹장' | '그룹원'
  currentMembers: number
  capacity: number
  createdAt: string
  leaderName: string
  meetingState: string
  isLive: boolean
  visibleAvatars: number
  hiddenMembers?: number
}

export interface StudyGroupMember {
  id: number
  name: string
  role: string
  isSelf: boolean
}

export interface StudyCalendarAttendance {
  name: string
  attended: boolean
}

export interface StudyCalendarEvent {
  date: string
  attendance: StudyCalendarAttendance[]
  agenda: string[]
}

export interface StudyChatMessage {
  id: number
  sender: string
  content: string
  isSelf: boolean
  reaction?: string
}

export interface StudyChatGroup {
  id: 'A' | 'B' | 'C'
  notice: string
  messages: StudyChatMessage[]
}

export interface StudyApplication {
  id: number
  name: string
  role: string
  introduction: string
  status: 'pending' | 'approved' | 'rejected'
}

// TODO: 실제 API 연동 필요 — 스터디 라운지 목록/검색 API 응답으로 교체.
export const mockStudyCards: StudyCardData[] = [
  {
    id: 1,
    role: '프론트엔드',
    company: 'REACT',
    title: 'REACT 프론트엔드 면접 대비',
    description: 'REACT 기반 기술 면접 실전 준비. 정기 모임.',
    recruitmentStatus: '모집 중',
    currentMembers: 3,
    capacity: 8,
    createdOrder: 9,
    schedule: ['매주 화, 목 20:00'],
    activities: ['모의면접, 기술 질문, 피드백', 'React·JavaScript·CS 질문 대비'],
  },
  {
    id: 2,
    role: '백엔드',
    title: '대규모 트래픽 설계 면접 스터디',
    description: '시스템 설계 · CS 심화 질문을 함께 파고드는 모임.',
    recruitmentStatus: '마감 임박',
    currentMembers: 5,
    capacity: 6,
    createdOrder: 8,
    schedule: ['매주 수 20:30'],
    activities: ['대규모 트래픽 설계 토론', 'Java·Spring·DB 심화 질문'],
  },
  {
    id: 3,
    role: 'AI',
    title: 'ML 엔지니어 실전 면접',
    description: '모델링 경험 발표와 논문 기반 질의응답 연습.',
    recruitmentStatus: '모집 중',
    currentMembers: 2,
    capacity: 5,
    createdOrder: 7,
    schedule: ['매주 토 14:00'],
    activities: ['프로젝트 경험 발표', 'ML 시스템·논문 질의응답'],
  },
  {
    id: 4,
    role: 'PT면접',
    badgeLabel: '111',
    title: '111',
    description: '111',
    recruitmentStatus: '모집 중',
    currentMembers: 4,
    capacity: 8,
    membersLabel: 'n/N명',
    createdOrder: 6,
    schedule: ['매주 월, 목 21:00'],
    activities: ['시사 주제 PT 발표', '발표 피드백과 예상 질문'],
  },
  {
    id: 5,
    role: '인성면접',
    badgeLabel: '222',
    title: '222',
    description: '2222',
    recruitmentStatus: '모집 중',
    currentMembers: 3,
    capacity: 6,
    membersLabel: 'n/N명',
    createdOrder: 5,
    schedule: ['매주 일 19:00'],
    activities: ['STAR 답변 첨삭', '압박·꼬리 질문 모의면접'],
  },
  {
    id: 6,
    role: '백엔드',
    badgeLabel: '333',
    title: '333',
    description: '333',
    recruitmentStatus: '모집 중',
    currentMembers: 2,
    capacity: 7,
    membersLabel: 'n/N명',
    createdOrder: 4,
    schedule: ['매주 화 19:30'],
    activities: ['CS 주제별 발표', '기술 면접 질문과 상호 피드백'],
  },
  {
    id: 7,
    role: 'DATA',
    title: '데이터 분석가 포트폴리오 면접',
    description: '분석 프로젝트를 비즈니스 임팩트 중심으로 설명해요.',
    recruitmentStatus: '신청 대기',
    currentMembers: 5,
    capacity: 8,
    createdOrder: 3,
    schedule: ['격주 토 11:00'],
    activities: ['포트폴리오 발표', 'SQL·통계 질문 대비'],
  },
  {
    id: 8,
    role: 'INFRA',
    title: 'DevOps 아키텍처 면접 준비',
    description: '클라우드 운영 사례와 장애 대응 경험을 점검해요.',
    recruitmentStatus: '마감 임박',
    currentMembers: 5,
    capacity: 6,
    createdOrder: 2,
    schedule: ['매주 금 20:00'],
    activities: ['아키텍처 리뷰', '장애 대응 시나리오 면접'],
  },
  {
    id: 9,
    role: 'PM/PO',
    title: '프로덕트 케이스 면접 스터디',
    description: '제품 문제 정의부터 지표 설계까지 케이스로 연습해요.',
    recruitmentStatus: '마감',
    currentMembers: 6,
    capacity: 6,
    createdOrder: 1,
    schedule: ['매주 수 21:00'],
    activities: ['제품 개선 케이스', '우선순위와 지표 설계 피드백'],
  },
]

// TODO: 실제 API 연동 필요 — 로그인 사용자의 내 스터디 목록으로 교체.
export const mockMyStudies: MyStudyData[] = [
  {
    id: 101,
    title: '금융권 면접 PT 대비',
    description:
      '금융권 PT · 토론 면접을 실전처럼 준비하는 그룹입니다. 매 세션 발표 후 상호 피드백을 진행합니다.',
    role: '그룹장',
    currentMembers: 5,
    capacity: 8,
    createdAt: '2026. 06. 20',
    leaderName: '김아이',
    meetingState: '화상 스터디 진행중',
    isLive: true,
    visibleAvatars: 3,
    hiddenMembers: 2,
  },
  {
    id: 102,
    title: '백엔드 기술 연습',
    description:
      '백엔드 기술 면접의 핵심 CS와 시스템 설계 질문을 함께 연습하는 그룹입니다.',
    role: '그룹원',
    currentMembers: 2,
    capacity: 6,
    createdAt: '2026. 07. 02',
    leaderName: '이싸피',
    meetingState: '다음 모임 D-2',
    isLive: false,
    visibleAvatars: 2,
  },
]

// TODO: 실제 API 연동 필요 — 그룹 상세의 구성원 목록으로 교체.
export const mockStudyGroupMembers: Record<number, StudyGroupMember[]> = {
  101: [
    { id: 1, name: '나(김아이)', role: '프론트엔드 지원', isSelf: true },
    { id: 2, name: '김구미', role: '백엔드 지원', isSelf: false },
    { id: 3, name: '강프로', role: '인프라 지원', isSelf: false },
    { id: 4, name: '최싸피', role: '프론트엔드 지원', isSelf: false },
    { id: 5, name: '홍길동', role: 'AI 지원', isSelf: false },
  ],
  102: [
    { id: 6, name: '나(김아이)', role: '프론트엔드 지원', isSelf: true },
    { id: 7, name: '이싸피', role: '백엔드 지원', isSelf: false },
  ],
}

// TODO: 실제 API 연동 필요 — 그룹 일정과 출석 기록 응답으로 교체.
export const mockStudyCalendarEvents: Record<number, StudyCalendarEvent[]> = {
  101: [
    {
      date: '2026-07-07',
      attendance: [
        { name: '김구미', attended: true },
        { name: '최싸피', attended: true },
        { name: '강프로', attended: true },
        { name: '김아이', attended: true },
        { name: '홍길동', attended: false },
      ],
      agenda: ['금융 이슈 브리핑', '발표 구성 피드백', '예상 질문 정리'],
    },
    {
      date: '2026-07-09',
      attendance: [],
      agenda: ['은행권 직무 분석', '지원 동기 피드백'],
    },
    {
      date: '2026-07-14',
      attendance: [],
      agenda: ['PT 발표 실습', '개인별 꼬리 질문'],
    },
    {
      date: '2026-07-16',
      attendance: [],
      agenda: ['토론 면접 역할 분담', '논리 구조 피드백'],
    },
    {
      date: '2026-07-21',
      attendance: [
        { name: '김싸피', attended: true },
        { name: '최싸피', attended: true },
        { name: '강프로', attended: true },
        { name: '김구미', attended: false },
        { name: '홍길동', attended: true },
      ],
      agenda: ['React 상태 관리', '개인별 질문 2개 준비', '장비 사전 확인'],
    },
    {
      date: '2026-07-23',
      attendance: [],
      agenda: ['금융 상품 분석', '상호 질의응답'],
    },
    {
      date: '2026-07-28',
      attendance: [],
      agenda: ['최종 PT 리허설', '발표 시간 점검'],
    },
    {
      date: '2026-07-30',
      attendance: [],
      agenda: ['월간 회고', '다음 달 일정 조율'],
    },
  ],
  102: [
    {
      date: '2026-07-22',
      attendance: [],
      agenda: ['대규모 트래픽 설계', '캐시 전략 비교'],
    },
  ],
}

// TODO: 실제 API 연동 필요 — 그룹별 공지와 실시간 채팅 메시지로 교체.
export const mockStudyChatGroups: StudyChatGroup[] = [
  {
    id: 'A',
    notice: '이번 주 세션은 화 20:00, PT 주제는 금리 인하기 자산 전략입니다.',
    messages: [
      {
        id: 1,
        sender: '최싸피',
        content: '발표 자료 오늘 밤까지 공유드릴게요!',
        isSelf: false,
      },
      {
        id: 2,
        sender: '나',
        content: '네 확인했습니다. 세션 전에 미리 읽어볼게요 👍',
        isSelf: true,
        reaction: '👍',
      },
      {
        id: 3,
        sender: '김구미',
        content: '저 오늘 10분 정도 늦을 것 같아요 ㅠ',
        isSelf: false,
      },
    ],
  },
  {
    id: 'B',
    notice: '수요일 20:30 시스템 설계 세션 전에 캐시 전략을 정리해 주세요.',
    messages: [
      {
        id: 4,
        sender: '이싸피',
        content: 'CDN과 Redis 비교 자료를 노션에 올렸습니다.',
        isSelf: false,
      },
    ],
  },
  {
    id: 'C',
    notice: '토요일 발표자는 논문 링크와 질문 두 개를 금요일까지 올려 주세요.',
    messages: [
      {
        id: 5,
        sender: '박싸피',
        content: '이번 주에는 추천 시스템 논문을 준비할게요.',
        isSelf: false,
      },
    ],
  },
]

// TODO: 실제 API 연동 필요 — 그룹장에게 도착한 가입 신청 목록으로 교체.
export const mockStudyApplications: StudyApplication[] = [
  {
    id: 201,
    name: '김아이',
    role: '프론트엔드 지원',
    introduction:
      '안녕하세요! 증권사 프론트엔드 직무를 준비 중인 김아이입니다. 금융권 PT면접 경험을 쌓고 싶어 신청드려요. 매주 화, 목 세션 모두 참여 가능합니다.',
    status: 'pending',
  },
  {
    id: 202,
    name: '이싸피',
    role: '백엔드 지원',
    introduction:
      'Java와 Spring 기반 백엔드 직무를 준비하고 있습니다. 금융 서비스 설계 경험을 나누고 싶습니다.',
    status: 'pending',
  },
]

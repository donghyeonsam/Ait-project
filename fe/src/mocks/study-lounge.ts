export interface StudyCalendarAttendance {
  name: string
  attended: boolean
}

export interface StudyCalendarEvent {
  date: string
  attendance: StudyCalendarAttendance[]
  agenda: string[]
}

// 하나의 이모지에 반응한 사람들을 묶어 표현하며, users.length가 곧 반응 수다.
export interface StudyChatReaction {
  emoji: string
  users: string[]
}

export interface StudyChatMessage {
  id: number
  sender: string
  content: string
  isSelf: boolean
  reactions?: StudyChatReaction[]
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
        reactions: [
          { emoji: '👍', users: ['나', '김구미'] },
          { emoji: '🙏', users: ['정싸피'] },
        ],
      },
      {
        id: 2,
        sender: '나',
        content: '네 확인했습니다. 세션 전에 미리 읽어볼게요 👍',
        isSelf: true,
        reactions: [{ emoji: '👍', users: ['최싸피'] }],
      },
      {
        id: 3,
        sender: '김구미',
        content: '저 오늘 10분 정도 늦을 것 같아요 ㅠ',
        isSelf: false,
        reactions: [{ emoji: '❤️', users: ['나', '최싸피', '정싸피'] }],
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

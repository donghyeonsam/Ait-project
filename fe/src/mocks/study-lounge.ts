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
// 메시지 목록은 실제 채팅 연동 전까지 빈 배열로 둔다.
export const mockStudyChatGroups: StudyChatGroup[] = [
  {
    id: 'A',
    notice: '이번 주 세션은 화 20:00, PT 주제는 금리 인하기 자산 전략입니다.',
    messages: [],
  },
  {
    id: 'B',
    notice: '수요일 20:30 시스템 설계 세션 전에 캐시 전략을 정리해 주세요.',
    messages: [],
  },
  {
    id: 'C',
    notice: '토요일 발표자는 논문 링크와 질문 두 개를 금요일까지 올려 주세요.',
    messages: [],
  },
]

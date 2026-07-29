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

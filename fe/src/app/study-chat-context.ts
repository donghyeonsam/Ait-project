// 그룹톡 안읽음 수와 모달 열림 상태를 담는 전역 컨텍스트 정의. Provider는 StudyChatProvider가 맡는다.
import { createContext } from 'react'

export interface StudyChatContextValue {
  // 비로그인이거나 아직 계산 전이면 undefined로 두어 배지를 숨긴다.
  totalUnread: number | undefined
  unreadByGroup: Record<number, number>
  isChatOpen: boolean
  openChat: () => void
  closeChat: () => void
  refresh: () => void
  markAllRead: () => void
}

// Provider 없이 헤더만 렌더되는 화면(테스트 등)에서도 동작하도록 배지 없는 기본값을 둔다.
export const studyChatDefaultValue: StudyChatContextValue = {
  totalUnread: undefined,
  unreadByGroup: {},
  isChatOpen: false,
  openChat: () => {},
  closeChat: () => {},
  refresh: () => {},
  markAllRead: () => {},
}

export const StudyChatContext = createContext<StudyChatContextValue>(
  studyChatDefaultValue,
)

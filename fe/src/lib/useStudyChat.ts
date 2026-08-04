import { useContext } from 'react'
import { StudyChatContext } from '@/app/study-chat-context'

// 그룹톡 안읽음 상태와 모달 열림 제어에 접근하는 훅. Provider 밖에서는 배지 없는 기본값을 반환한다.
export function useStudyChat() {
  return useContext(StudyChatContext)
}

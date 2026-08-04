import { useEffect, useRef, useState, type RefObject } from 'react'

// 답글 인용을 눌렀을 때 스크롤 목록 안의 원본 메시지로 이동하고 잠시 강조한다.
export function useStudyChatQuoteScroll(
  listRef: RefObject<HTMLDivElement | null>,
) {
  const [highlightedChatId, setHighlightedChatId] = useState<number | null>(
    null,
  )
  const timeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    },
    [],
  )

  // 원본이 아직 불러오지 않은 과거 이력에 있으면 이동하지 않는다.
  const scrollToMessage = (chatId: number) => {
    const target = listRef.current?.querySelector(`[data-chat-id="${chatId}"]`)
    if (!target) return

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedChatId(chatId)
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(
      () => setHighlightedChatId(null),
      1600,
    )
  }

  return { highlightedChatId, scrollToMessage }
}

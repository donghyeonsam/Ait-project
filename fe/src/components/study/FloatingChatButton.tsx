import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { useChat } from '@livekit/components-react'
import { MessageSquare, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingChatButtonProps {
  boundsRef: RefObject<HTMLDivElement | null>
}

const BUTTON_SIZE = 48
const MARGIN = 16
const PANEL_WIDTH = 288
const PANEL_HEIGHT = 320
const PANEL_GAP = 12
/** 이 거리 이하로 움직이면 드래그가 아니라 클릭(열기/닫기)으로 간주한다. */
const DRAG_THRESHOLD = 5

interface Position {
  x: number
  y: number
}

interface DragState {
  pointerId: number
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  moved: boolean
}

// 자유롭게 드래그해서 위치를 옮길 수 있는 채팅 버튼. 누른 자리에서 채팅창이 열린다.
// 실시간 송수신은 LiveKit Room의 데이터 채널을 쓰는 useChat()으로 처리한다 —
// 별도 백엔드 없이 세션에 연결된 참가자끼리만 실시간으로 메시지를 주고받는다(이력은 저장되지 않음).
export function FloatingChatButton({ boundsRef }: FloatingChatButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dragState = useRef<DragState | null>(null)
  // 사용자가 아직 드래그하지 않았다면 위치를 상태로 커밋하지 않고, 컨테이너 크기로부터 매번 기본값을 계산한다.
  const [position, setPosition] = useState<Position | null>(null)
  const [open, setOpen] = useState(false)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  const { chatMessages, send, isSending } = useChat()
  const [draft, setDraft] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const messageListRef = useRef<HTMLDivElement>(null)

  // 패널이 닫혀 있을 때 도착한 메시지 수만큼 배지를 채우고, 열려 있으면 즉시 읽음 처리한다.
  // (렌더 중 상태 조정 패턴 — StudySessionRoom의 identityIdMap 갱신과 동일한 이유로 useEffect 대신 사용한다.)
  const [seenState, setSeenState] = useState({ open, messageCount: chatMessages.length })
  if (seenState.open !== open || seenState.messageCount !== chatMessages.length) {
    if (open) {
      setUnreadCount(0)
    } else if (chatMessages.length > seenState.messageCount) {
      setUnreadCount((count) => count + (chatMessages.length - seenState.messageCount))
    }
    setSeenState({ open, messageCount: chatMessages.length })
  }

  useEffect(() => {
    if (!open) return
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight })
  }, [open, chatMessages.length])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || isSending) return
    setDraft('')
    void send(trimmed)
  }

  useEffect(() => {
    const bounds = boundsRef.current
    if (!bounds) return
    const updateSize = () => setContainerSize({ width: bounds.clientWidth, height: bounds.clientHeight })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(bounds)
    return () => observer.disconnect()
  }, [boundsRef])

  const effectivePosition =
    position ??
    (containerSize
      ? { x: containerSize.width - BUTTON_SIZE - MARGIN, y: containerSize.height - BUTTON_SIZE - MARGIN }
      : null)

  const clamp = (x: number, y: number): Position => {
    const bounds = boundsRef.current
    if (!bounds) return { x, y }
    const maxX = Math.max(bounds.clientWidth - BUTTON_SIZE, 0)
    const maxY = Math.max(bounds.clientHeight - BUTTON_SIZE, 0)
    return { x: Math.min(Math.max(x, 0), maxX), y: Math.min(Math.max(y, 0), maxY) }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!effectivePosition) return
    buttonRef.current?.setPointerCapture(event.pointerId)
    dragState.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - effectivePosition.x,
      offsetY: event.clientY - effectivePosition.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD) {
      drag.moved = true
    }
    setPosition(clamp(event.clientX - drag.offsetX, event.clientY - drag.offsetY))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) return
    buttonRef.current?.releasePointerCapture(event.pointerId)
    dragState.current = null
    if (!drag.moved) {
      setOpen((value) => !value)
    }
  }

  if (!effectivePosition) return null

  const panelLeft = containerSize
    ? Math.min(
        Math.max(effectivePosition.x - PANEL_WIDTH + BUTTON_SIZE, 0),
        Math.max(containerSize.width - PANEL_WIDTH, 0),
      )
    : effectivePosition.x
  const panelBottom = containerSize ? containerSize.height - effectivePosition.y + PANEL_GAP : 0

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-pressed={open}
        aria-label={open ? '채팅 닫기' : '채팅 열기'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ left: effectivePosition.x, top: effectivePosition.y, width: BUTTON_SIZE, height: BUTTON_SIZE }}
        className="absolute z-20 flex touch-none cursor-grab items-center justify-center rounded-ait-pill bg-action-primary text-white shadow-elevation-2 transition-colors hover:bg-action-primary/90 active:cursor-grabbing"
      >
        <MessageSquare className="size-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-ait-pill bg-status-error px-1 text-caption font-medium text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          style={{ left: panelLeft, bottom: panelBottom, width: PANEL_WIDTH, height: PANEL_HEIGHT }}
          className="absolute z-20 flex flex-col rounded-ait-l border border-border-default bg-surface-default shadow-elevation-3"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border-default px-4 py-3">
            <p className="text-body-2 font-medium text-text-primary">채팅</p>
            <button
              type="button"
              aria-label="채팅 닫기"
              onClick={() => setOpen(false)}
              className="rounded-ait-s p-1 text-text-secondary hover:bg-status-neutral-surface"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {chatMessages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-body-2 text-text-secondary">
              아직 채팅 메시지가 없습니다.
            </div>
          ) : (
            <div ref={messageListRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
              {chatMessages.map((chatMessage) => {
                const isMine = chatMessage.from?.isLocal ?? false
                const senderName = chatMessage.from?.name || chatMessage.from?.identity || '참가자'

                return (
                  <div key={chatMessage.id} className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}>
                    {!isMine ? (
                      <span className="mb-0.5 px-1 text-caption text-text-secondary">{senderName}</span>
                    ) : null}
                    <span
                      className={cn(
                        'max-w-[85%] rounded-ait-m px-3 py-1.5 text-body-2 wrap-break-word',
                        isMine ? 'bg-action-primary text-white' : 'bg-status-neutral-surface text-text-primary',
                      )}
                    >
                      {chatMessage.message}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-border-default p-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="메시지를 입력하세요"
              aria-label="채팅 메시지 입력"
              className="flex-1 rounded-ait-s border border-border-default bg-surface-default px-3 py-1.5 text-body-2 text-text-primary focus:border-action-primary focus:outline-none focus:ring-3 focus:ring-action-primary/25"
            />
            <button
              type="submit"
              aria-label="메시지 보내기"
              disabled={!draft.trim() || isSending}
              className="flex size-8 shrink-0 items-center justify-center rounded-ait-s bg-action-primary text-white transition-colors hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      ) : null}
    </>
  )
}

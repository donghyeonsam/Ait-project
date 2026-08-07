import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { useChat } from '@livekit/components-react'
import { MessageSquare, Send, SmilePlus, X } from 'lucide-react'
import { studyChatEmojis } from '@/components/study/studyChatEmojis'
import { cn } from '@/lib/utils'

interface FloatingChatButtonProps {
  boundsRef: RefObject<HTMLDivElement | null>
}

const BUTTON_SIZE = 48
const MARGIN = 16
const DEFAULT_PANEL_WIDTH = 336
const DEFAULT_PANEL_HEIGHT = 360
const MIN_PANEL_WIDTH = 320
const MIN_PANEL_HEIGHT = 280
const MAX_PANEL_WIDTH = 560
const MAX_PANEL_HEIGHT = 640
const PANEL_GAP = 12
/** 이 거리 이하로 움직이면 드래그가 아니라 클릭(열기/닫기)으로 간주한다. */
const DRAG_THRESHOLD = 5

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface DragState {
  pointerId: number
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  moved: boolean
}

interface ResizeState {
  pointerId: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  /** 리사이즈 도중 크기 변화로 열림 방향이 뒤집혀 델타 기준이 바뀌지 않도록 시작 시점 방향을 고정한다. */
  openUp: boolean
}

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(max, min))

// 자유롭게 드래그해서 위치를 옮길 수 있는 채팅 버튼. 누른 자리에서 채팅창이 열린다.
// 실시간 송수신은 LiveKit Room의 데이터 채널을 쓰는 useChat()으로 처리한다 —
// 별도 백엔드 없이 세션에 연결된 참가자끼리만 실시간으로 메시지를 주고받는다(이력은 저장되지 않음).
export function FloatingChatButton({ boundsRef }: FloatingChatButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<DragState | null>(null)
  const resizeState = useRef<ResizeState | null>(null)
  const closeAnimationTimerRef = useRef<number | null>(null)
  // 사용자가 아직 드래그하지 않았다면 위치를 상태로 커밋하지 않고, 컨테이너 크기로부터 매번 기본값을 계산한다.
  const [position, setPosition] = useState<Position | null>(null)
  const [open, setOpen] = useState(false)
  const [panelMounted, setPanelMounted] = useState(false)
  const [panelSize, setPanelSize] = useState<Size>({ width: DEFAULT_PANEL_WIDTH, height: DEFAULT_PANEL_HEIGHT })
  const [containerSize, setContainerSize] = useState<Size | null>(null)
  const { chatMessages, send, isSending } = useChat()
  const [draft, setDraft] = useState('')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messageListRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(
    () => () => {
      if (closeAnimationTimerRef.current !== null) {
        window.clearTimeout(closeAnimationTimerRef.current)
      }
    },
    [],
  )

  const changeChatOpen = (nextOpen: boolean) => {
    if (closeAnimationTimerRef.current !== null) {
      window.clearTimeout(closeAnimationTimerRef.current)
      closeAnimationTimerRef.current = null
    }

    if (nextOpen) {
      setPanelMounted(true)
      setOpen(true)
      return
    }

    setOpen(false)
    setEmojiPickerOpen(false)
    closeAnimationTimerRef.current = window.setTimeout(() => {
      setPanelMounted(false)
      closeAnimationTimerRef.current = null
    }, 250)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || isSending) return
    setDraft('')
    setEmojiPickerOpen(false)
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

  // 저장된 위치는 그대로 두고 표시 위치만 컨테이너 크기로 잘라낸다 — 우측 패널이 열려 영역이
  // 좁아지면 버튼이 경계를 따라 안쪽으로 밀려나고(패널 폭 트랜지션을 ResizeObserver가 프레임마다
  // 따라가므로 밀림도 같은 속도로 애니메이션된다), 패널이 닫히면 원래 자리로 되돌아온다.
  const storedPosition =
    position ??
    (containerSize
      ? { x: containerSize.width - BUTTON_SIZE - MARGIN, y: containerSize.height - BUTTON_SIZE - MARGIN }
      : null)
  const effectivePosition =
    storedPosition && containerSize
      ? {
          x: clampValue(storedPosition.x, 0, containerSize.width - BUTTON_SIZE),
          y: clampValue(storedPosition.y, 0, containerSize.height - BUTTON_SIZE),
        }
      : storedPosition

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
      changeChatOpen(!open)
    }
  }

  if (!effectivePosition) return null

  const panelWidth = containerSize ? Math.min(panelSize.width, containerSize.width) : panelSize.width
  const requestedPanelHeight = containerSize
    ? Math.min(panelSize.height, containerSize.height)
    : panelSize.height

  // 버튼 위 공간이 패널 높이보다 부족하면 아래 방향으로 열고, 그래도 넘치면 top을 컨테이너 안으로
  // 잘라내 어떤 버튼 위치에서도 패널 전체가 영역 안에 남게 한다.
  const spaceAbove = Math.max(effectivePosition.y - PANEL_GAP, 0)
  const spaceBelow = containerSize ? containerSize.height - (effectivePosition.y + BUTTON_SIZE) - PANEL_GAP : 0
  const openUp =
    spaceAbove >= requestedPanelHeight || spaceAbove >= spaceBelow
  // 선택한 방향의 실제 여유 높이까지만 패널을 키워 버튼과 패널의 영역이 겹치지 않게 한다.
  const availablePanelHeight = openUp ? spaceAbove : Math.max(spaceBelow, 0)
  const panelHeight = containerSize
    ? Math.min(requestedPanelHeight, availablePanelHeight)
    : requestedPanelHeight
  const panelLeft = containerSize
    ? clampValue(effectivePosition.x - panelWidth + BUTTON_SIZE, 0, Math.max(containerSize.width - panelWidth, 0))
    : effectivePosition.x
  const rawPanelTop = openUp
    ? effectivePosition.y - PANEL_GAP - panelHeight
    : effectivePosition.y + BUTTON_SIZE + PANEL_GAP
  const panelTop = containerSize
    ? clampValue(rawPanelTop, 0, Math.max(containerSize.height - panelHeight, 0))
    : rawPanelTop

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    resizeHandleRef.current?.setPointerCapture(event.pointerId)
    resizeState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: panelWidth,
      startHeight: panelHeight,
      openUp,
    }
  }

  const handleResizePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = resizeState.current
    if (!resize || resize.pointerId !== event.pointerId) return
    const maxWidth = containerSize ? Math.min(MAX_PANEL_WIDTH, containerSize.width) : MAX_PANEL_WIDTH
    const maxHeight = containerSize ? Math.min(MAX_PANEL_HEIGHT, containerSize.height) : MAX_PANEL_HEIGHT
    // 패널은 버튼에 오른쪽 끝이 맞춰져 왼쪽으로 자라므로 왼쪽 드래그가 너비 증가, 열림 방향의
    // 반대쪽(위로 열렸으면 위쪽) 드래그가 높이 증가다.
    const deltaHeight = resize.openUp ? resize.startY - event.clientY : event.clientY - resize.startY
    setPanelSize({
      width: clampValue(resize.startWidth + (resize.startX - event.clientX), MIN_PANEL_WIDTH, maxWidth),
      height: clampValue(resize.startHeight + deltaHeight, MIN_PANEL_HEIGHT, maxHeight),
    })
  }

  const handleResizePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = resizeState.current
    if (!resize || resize.pointerId !== event.pointerId) return
    resizeHandleRef.current?.releasePointerCapture(event.pointerId)
    resizeState.current = null
  }

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
        className="absolute z-(--z-index-sticky) flex touch-none cursor-grab items-center justify-center rounded-ait-pill bg-action-primary text-white shadow-elevation-2 transition-[background-color,transform] duration-250 ease-emphasized hover:bg-action-primary/90 active:cursor-grabbing motion-reduce:transition-none"
      >
        <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-ait-pill">
          <MessageSquare
            className={cn(
              'absolute size-5 transition-[opacity,transform] duration-250 ease-emphasized motion-reduce:transition-none',
              open
                ? 'rotate-90 scale-50 opacity-0'
                : 'rotate-0 scale-100 opacity-100',
            )}
            aria-hidden="true"
          />
          <X
            className={cn(
              'absolute size-5 transition-[opacity,transform] duration-250 ease-emphasized motion-reduce:transition-none',
              open
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-50 opacity-0',
            )}
            aria-hidden="true"
          />
        </span>
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-ait-pill bg-status-error px-1 text-caption font-medium text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {panelMounted && panelHeight > 0 ? (
        <div
          data-state={open ? 'open' : 'closed'}
          style={{ left: panelLeft, top: panelTop, width: panelWidth, height: panelHeight }}
          className={cn(
            'study-session-chat-panel absolute z-(--z-index-dropdown) flex min-w-0 flex-col overflow-hidden rounded-ait-l border border-border-default bg-surface-default shadow-elevation-3',
            !open && 'pointer-events-none',
          )}
        >
          <div
            ref={resizeHandleRef}
            aria-hidden="true"
            title="드래그해서 채팅창 크기 조절"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className={cn(
              'absolute left-0 z-10 size-4 touch-none',
              openUp ? 'top-0 cursor-nwse-resize' : 'bottom-0 cursor-nesw-resize',
            )}
          />
          <div className="flex shrink-0 items-center justify-between border-b border-border-default px-4 py-3">
            <p className="text-body-2 font-medium text-text-primary">채팅</p>
            <button
              type="button"
              aria-label="채팅 닫기"
              onClick={() => {
                changeChatOpen(false)
              }}
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

          <form
            onSubmit={handleSubmit}
            className="relative flex min-w-0 shrink-0 items-center gap-2 border-t border-border-default p-2"
          >
            {emojiPickerOpen ? (
              <div
                role="dialog"
                aria-label="이모지 선택"
                className="absolute inset-x-2 bottom-full z-10 mb-2 grid max-h-40 grid-cols-8 gap-1 overflow-y-auto rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2"
              >
                {studyChatEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setDraft((current) => `${current}${emoji}`)
                      setEmojiPickerOpen(false)
                      messageInputRef.current?.focus()
                    }}
                    aria-label={`${emoji} 입력`}
                    className="flex aspect-square items-center justify-center rounded-ait-s text-body-1 hover:bg-status-neutral-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              aria-label="이모지 선택"
              aria-expanded={emojiPickerOpen}
              onClick={() => setEmojiPickerOpen((value) => !value)}
              className="flex size-8 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
            >
              <SmilePlus className="size-4" aria-hidden="true" />
            </button>
            <input
              ref={messageInputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="메시지를 입력하세요"
              aria-label="채팅 메시지 입력"
              className="min-w-0 flex-1 rounded-ait-s border border-border-default bg-surface-default px-3 py-1.5 text-body-2 text-text-primary focus:border-action-primary focus:outline-none focus:ring-3 focus:ring-action-primary/25"
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

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { User } from 'lucide-react'

interface FloatingSelfViewProps {
  stream: MediaStream | null
  boundsRef: RefObject<HTMLDivElement | null>
  /** 초기 위치를 하단에서 추가로 띄우는 값(px). 하단 오버레이 패널에 가리지 않게 할 때 쓴다. */
  initialBottomOffset?: number
}

const SELF_VIEW_WIDTH = 176
const SELF_VIEW_HEIGHT = 132
const MARGIN = 16

interface Position {
  x: number
  y: number
}

export function FloatingSelfView({
  stream,
  boundsRef,
  initialBottomOffset = 0,
}: FloatingSelfViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const [position, setPosition] = useState<Position | null>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    if (position) {
      return
    }
    const bounds = boundsRef.current
    if (!bounds) {
      return
    }
    setPosition({
      x: MARGIN,
      y: Math.max(
        bounds.clientHeight - SELF_VIEW_HEIGHT - MARGIN - initialBottomOffset,
        0,
      ),
    })
  }, [boundsRef, initialBottomOffset, position])

  const clamp = (x: number, y: number): Position => {
    const bounds = boundsRef.current
    if (!bounds) {
      return { x, y }
    }
    const maxX = Math.max(bounds.clientWidth - SELF_VIEW_WIDTH, 0)
    const maxY = Math.max(bounds.clientHeight - SELF_VIEW_HEIGHT, 0)
    return { x: Math.min(Math.max(x, 0), maxX), y: Math.min(Math.max(y, 0), maxY) }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!position) {
      return
    }
    boxRef.current?.setPointerCapture(event.pointerId)
    dragState.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
      return
    }
    setPosition(clamp(event.clientX - dragState.current.offsetX, event.clientY - dragState.current.offsetY))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === event.pointerId) {
      boxRef.current?.releasePointerCapture(event.pointerId)
      dragState.current = null
    }
  }

  if (!position) {
    return null
  }

  return (
    <div
      ref={boxRef}
      role="presentation"
      aria-label="내 카메라 화면 (드래그로 이동 가능)"
      className="absolute touch-none cursor-grab overflow-hidden rounded-ait-s border-2 border-surface-default bg-status-neutral-surface text-text-secondary shadow-elevation-2 active:cursor-grabbing"
      style={{ width: SELF_VIEW_WIDTH, height: SELF_VIEW_HEIGHT, left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <User className="size-8" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

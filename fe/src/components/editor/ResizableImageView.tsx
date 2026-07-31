import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AuthenticatedImage } from '@/components/common/AuthenticatedImage'
import { cn } from '@/lib/utils'

export type ImageAlign = 'left' | 'center' | 'right'
type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface ImagePosition {
  x: number
  y: number
}

const MIN_WIDTH_PERCENT = 20
const MAX_WIDTH_PERCENT = 100

const ALIGN_OPTIONS: { value: ImageAlign; label: string; Icon: typeof AlignLeft }[] = [
  { value: 'left', label: '왼쪽 정렬', Icon: AlignLeft },
  { value: 'center', label: '가운데 정렬', Icon: AlignCenter },
  { value: 'right', label: '오른쪽 정렬', Icon: AlignRight },
]

const RESIZE_CORNERS: {
  value: ResizeCorner
  label: string
  className: string
}[] = [
  {
    value: 'top-left',
    label: '왼쪽 위 이미지 크기 조절',
    className: '-left-1.5 -top-1.5 cursor-nwse-resize',
  },
  {
    value: 'top-right',
    label: '오른쪽 위 이미지 크기 조절',
    className: '-right-1.5 -top-1.5 cursor-nesw-resize',
  },
  {
    value: 'bottom-left',
    label: '왼쪽 아래 이미지 크기 조절',
    className: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
  },
  {
    value: 'bottom-right',
    label: '오른쪽 아래 이미지 크기 조절',
    className: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
  },
]

const toFiniteNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

// 본문 이미지를 네 꼭짓점으로 비율 조절하고 이미지 자체를 드래그해 자유롭게 이동한다.
export function ResizableImageView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const activeInteractionCleanupRef = useRef<(() => void) | null>(null)
  const [resizingPercent, setResizingPercent] = useState<number | null>(null)
  const [draggingPosition, setDraggingPosition] =
    useState<ImagePosition | null>(null)

  const align = (node.attrs.align as ImageAlign | null) ?? 'left'
  const width = (node.attrs.width as string | null) ?? undefined
  const storedPosition = {
    x: toFiniteNumber(node.attrs.offsetX),
    y: toFiniteNumber(node.attrs.offsetY),
  }
  const position = draggingPosition ?? storedPosition
  const isEditable = editor.isEditable
  const isDragging = draggingPosition !== null
  const showControls =
    isEditable && (selected || resizingPercent !== null || isDragging)

  const bindPointerInteraction = (
    onMove: (event: PointerEvent) => void,
    onEnd: () => void,
  ) => {
    activeInteractionCleanupRef.current?.()

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      if (activeInteractionCleanupRef.current === cleanup) {
        activeInteractionCleanupRef.current = null
      }
    }
    const finish = () => {
      cleanup()
      onEnd()
    }

    activeInteractionCleanupRef.current = cleanup
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  useEffect(
    () => () => {
      activeInteractionCleanupRef.current?.()
    },
    [],
  )

  const startResize =
    (corner: ResizeCorner) => (event: React.PointerEvent) => {
      if (!isEditable || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()

      const figure = figureRef.current
      const wrapper = wrapperRef.current
      if (!figure || !wrapper) return

      const startX = event.clientX
      const startY = event.clientY
      const startWidth = figure.offsetWidth
      const startHeight = figure.offsetHeight
      const maxWidth = wrapper.offsetWidth || startWidth
      if (startWidth <= 0 || maxWidth <= 0) return

      const aspectRatio = startWidth / Math.max(startHeight, 1)
      const startPosition = storedPosition
      const isLeft = corner.endsWith('left')
      const isTop = corner.startsWith('top')
      const horizontalDirection = isLeft ? -1 : 1
      const verticalDirection = isTop ? -1 : 1

      const onMove = (move: PointerEvent) => {
        const horizontalChange =
          (move.clientX - startX) * horizontalDirection
        const verticalChange =
          (move.clientY - startY) * verticalDirection * aspectRatio
        const widthChange =
          Math.abs(horizontalChange) >= Math.abs(verticalChange)
            ? horizontalChange
            : verticalChange
        const nextWidth = clamp(
          startWidth + widthChange,
          maxWidth * (MIN_WIDTH_PERCENT / 100),
          maxWidth,
        )
        const percent = Math.round((nextWidth / maxWidth) * 100)
        const widthDifference = nextWidth - startWidth
        const heightDifference =
          nextWidth / aspectRatio - startHeight
        const nextPosition = {
          x: Math.round(
            startPosition.x - (isLeft ? widthDifference : 0),
          ),
          y: Math.round(
            startPosition.y - (isTop ? heightDifference : 0),
          ),
        }

        setResizingPercent(percent)
        updateAttributes({
          width: `${percent}%`,
          offsetX: nextPosition.x,
          offsetY: nextPosition.y,
        })
      }

      bindPointerInteraction(onMove, () => setResizingPercent(null))
    }

  const startMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditable || event.button !== 0) return
    if (
      (event.target as HTMLElement).closest('[data-image-control="true"]')
    ) {
      return
    }

    const figure = figureRef.current
    const wrapper = wrapperRef.current
    if (!figure || !wrapper) return

    if (!selected) {
      const nodePosition = getPos()
      if (typeof nodePosition === 'number') {
        editor.commands.setNodeSelection(nodePosition)
      }
    }

    event.preventDefault()
    event.stopPropagation()

    const editorRoot =
      wrapper.closest<HTMLElement>('.ProseMirror') ?? wrapper
    const figureRect = figure.getBoundingClientRect()
    const editorRect = editorRoot.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const startPosition = storedPosition
    const minDeltaX = editorRect.left - figureRect.left
    const maxDeltaX = editorRect.right - figureRect.right
    const minDeltaY = editorRect.top - figureRect.top
    const maxDeltaY = editorRect.bottom - figureRect.bottom

    setDraggingPosition(startPosition)

    const onMove = (move: PointerEvent) => {
      const deltaX = clamp(
        move.clientX - startX,
        minDeltaX,
        maxDeltaX,
      )
      const deltaY = clamp(
        move.clientY - startY,
        minDeltaY,
        maxDeltaY,
      )
      const nextPosition = {
        x: Math.round(startPosition.x + deltaX),
        y: Math.round(startPosition.y + deltaY),
      }

      setDraggingPosition(nextPosition)
      updateAttributes({
        offsetX: nextPosition.x,
        offsetY: nextPosition.y,
      })
    }

    bindPointerInteraction(onMove, () => setDraggingPosition(null))
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={cn(
        'flex',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-end',
      )}
      data-align={align}
    >
      <div
        ref={figureRef}
        role="group"
        aria-label="이미지 위치 및 크기 조절"
        onPointerDown={startMove}
        className={cn(
          'relative max-w-full rounded-ait-s',
          isEditable && 'touch-none select-none',
          isEditable && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
          showControls && 'ring-2 ring-brand-blue/60 ring-offset-1',
        )}
        style={{
          width,
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
      >
        <AuthenticatedImage
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string | null) ?? ''}
          draggable={false}
          className="pointer-events-none block w-full rounded-ait-s"
        />

        {showControls ? (
          <>
            <div
              role="toolbar"
              aria-label="이미지 정렬"
              data-image-control="true"
              className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-ait-s border border-line bg-surface-default p-0.5 shadow-card-hover"
            >
              {ALIGN_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={align === value}
                  onPointerDown={(pointerEvent) =>
                    pointerEvent.preventDefault()
                  }
                  onClick={() =>
                    updateAttributes({
                      align: value,
                      offsetX: 0,
                      offsetY: 0,
                    })
                  }
                  className={cn(
                    'inline-flex size-7 items-center justify-center rounded-ait-s transition-colors duration-[120ms]',
                    align === value
                      ? 'bg-surface-muted text-navy-800'
                      : 'text-ink-500 hover:bg-surface-muted hover:text-ink-700',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                </button>
              ))}
            </div>

            {RESIZE_CORNERS.map(({ value, label, className }) => (
              <span
                key={value}
                role="slider"
                aria-label={label}
                aria-valuemin={MIN_WIDTH_PERCENT}
                aria-valuemax={MAX_WIDTH_PERCENT}
                aria-valuenow={
                  resizingPercent ??
                  Number.parseInt(width ?? `${MAX_WIDTH_PERCENT}`, 10)
                }
                tabIndex={-1}
                data-image-control="true"
                onPointerDown={startResize(value)}
                className={cn(
                  'absolute z-10 size-3 rounded-[3px] border border-brand-blue bg-surface-default shadow-card-hover',
                  className,
                )}
              />
            ))}

            {resizingPercent !== null ? (
              <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-ait-s bg-ink-900/80 px-1.5 py-0.5 text-[11px] tabular-nums text-surface-default">
                {resizingPercent}%
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}

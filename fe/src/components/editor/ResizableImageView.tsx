import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type ImageAlign = 'left' | 'center' | 'right'

const MIN_WIDTH_PERCENT = 20
const MAX_WIDTH_PERCENT = 100

const ALIGN_OPTIONS: { value: ImageAlign; label: string; Icon: typeof AlignLeft }[] = [
  { value: 'left', label: '왼쪽 정렬', Icon: AlignLeft },
  { value: 'center', label: '가운데 정렬', Icon: AlignCenter },
  { value: 'right', label: '오른쪽 정렬', Icon: AlignRight },
]

// 본문 이미지의 크기(%)·정렬을 드래그 핸들과 정렬 버튼으로 조정하는 노드 뷰.
export function ResizableImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const [resizingPercent, setResizingPercent] = useState<number | null>(null)

  const align = (node.attrs.align as ImageAlign | null) ?? 'left'
  const width = (node.attrs.width as string | null) ?? undefined
  const isEditable = editor.isEditable
  const showControls = isEditable && (selected || resizingPercent !== null)

  const startResize = (side: 'left' | 'right') => (event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const figure = figureRef.current
    const wrapper = wrapperRef.current
    if (!figure || !wrapper) return

    const startX = event.clientX
    const startWidth = figure.offsetWidth
    const maxWidth = wrapper.offsetWidth

    const onMove = (move: PointerEvent) => {
      // 왼쪽 핸들은 왼쪽으로 끌수록 커지므로 이동량 부호를 뒤집는다.
      const delta = (move.clientX - startX) * (side === 'right' ? 1 : -1)
      const percent = Math.min(
        MAX_WIDTH_PERCENT,
        Math.max(MIN_WIDTH_PERCENT, Math.round(((startWidth + delta) / maxWidth) * 100)),
      )
      setResizingPercent(percent)
      updateAttributes({ width: `${percent}%` })
    }
    const onUp = () => {
      setResizingPercent(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
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
        className={cn(
          'relative max-w-full rounded-ait-s',
          showControls && 'ring-2 ring-brand-blue/60 ring-offset-1',
        )}
        style={{ width }}
      >
        <img
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string | null) ?? ''}
          draggable={false}
          className="block w-full rounded-ait-s"
        />

        {showControls ? (
          <>
            {/* 정렬 버튼 */}
            <div
              role="toolbar"
              aria-label="이미지 정렬"
              className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-ait-s border border-line bg-surface-default p-0.5 shadow-card-hover"
            >
              {ALIGN_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={align === value}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => updateAttributes({ align: value })}
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

            {/* 크기 조절 핸들 */}
            {(['left', 'right'] as const).map((side) => (
              <span
                key={side}
                role="slider"
                aria-label="이미지 크기 조절"
                aria-valuenow={resizingPercent ?? undefined}
                tabIndex={-1}
                onPointerDown={startResize(side)}
                className={cn(
                  'absolute top-1/2 z-10 h-9 w-2 -translate-y-1/2 cursor-ew-resize rounded-ait-pill border border-line bg-surface-default shadow-card-hover',
                  side === 'left' ? '-left-1' : '-right-1',
                )}
              />
            ))}

            {resizingPercent !== null ? (
              <span className="absolute bottom-2 right-2 z-10 rounded-ait-s bg-ink-900/80 px-1.5 py-0.5 text-[11px] tabular-nums text-surface-default">
                {resizingPercent}%
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}

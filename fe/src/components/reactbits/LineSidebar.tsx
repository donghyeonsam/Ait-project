import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'

type Falloff = 'linear' | 'smooth' | 'sharp'

export interface LineSidebarProps {
  items?: string[]
  accentColor?: string
  textColor?: string
  markerColor?: string
  showIndex?: boolean
  showMarker?: boolean
  proximityRadius?: number
  maxShift?: number
  falloff?: Falloff
  markerLength?: number
  markerGap?: number
  tickScale?: number
  scaleTick?: boolean
  itemGap?: number
  fontSize?: number
  smoothing?: number
  defaultActive?: number | null
  onItemClick?: (index: number, label: string) => void
  ariaLabel?: string
  className?: string
  disabled?: boolean
}

const falloffCurves: Record<Falloff, (progress: number) => number> = {
  linear: (progress) => progress,
  smooth: (progress) => progress * progress * (3 - 2 * progress),
  sharp: (progress) => progress * progress * progress,
}

const defaultItems = [
  'Overview',
  'Components',
  'Animations',
  'Backgrounds',
  'Showcase',
  'Playground',
  'Templates',
  'Changelog',
  'Community',
  'Resources',
  'Documentation',
  'Support',
]

// React Bits 기반 목록 내비게이션. 포인터와 각 항목의 거리로 이동/스케일 효과를 계산해
// requestAnimationFrame으로 부드럽게 보간한다. 모션 최소화 설정 시 애니메이션을 끈다.
export function LineSidebar({
  items = defaultItems,
  accentColor = 'var(--color-action-primary)',
  textColor = 'var(--color-text-secondary)',
  markerColor = 'var(--color-border-default)',
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 30,
  falloff = 'smooth',
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  defaultActive = null,
  onItemClick,
  ariaLabel = '목록',
  className = '',
  disabled = false,
}: LineSidebarProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<Array<HTMLLIElement | null>>([])
  const targetsRef = useRef<number[]>([])
  const currentRef = useRef<number[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const frameCallbackRef = useRef<((now: number) => void) | null>(null)
  const lastFrameRef = useRef(0)
  const activeIndexRef = useRef<number | null>(defaultActive)
  const smoothingRef = useRef(smoothing)
  const [activeIndex, setActiveIndex] = useState<number | null>(defaultActive)

  const requestNextFrame = useCallback(() => {
    animationFrameRef.current = window.requestAnimationFrame((now) =>
      frameCallbackRef.current?.(now),
    )
  }, [])

  const runFrame = useCallback(
    (now: number) => {
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const elapsed = Math.min((now - lastFrameRef.current) / 1000, 0.05)
      const smoothingSeconds = Math.max(smoothingRef.current, 1) / 1000
      const interpolation = reducedMotion
        ? 1
        : 1 - Math.exp(-elapsed / smoothingSeconds)
      let moving = false

      itemRefs.current.forEach((item, index) => {
        if (!item) return
        const target = Math.max(
          targetsRef.current[index] || 0,
          activeIndexRef.current === index ? 1 : 0,
        )
        const current = currentRef.current[index] || 0
        const next = current + (target - current) * interpolation
        const settled = Math.abs(target - next) < 0.0015
        const value = settled ? target : next

        currentRef.current[index] = value
        item.style.setProperty('--effect', value.toFixed(4))
        if (!settled) moving = true
      })

      if (moving) requestNextFrame()
      else animationFrameRef.current = null
    },
    [requestNextFrame],
  )

  useEffect(() => {
    frameCallbackRef.current = runFrame
  }, [runFrame])

  const startAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) return
    lastFrameRef.current = performance.now()
    requestNextFrame()
  }, [requestNextFrame])

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLUListElement>) => {
      if (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !listRef.current
      ) {
        return
      }

      const listBounds = listRef.current.getBoundingClientRect()
      const pointerY = event.clientY - listBounds.top
      const curve = falloffCurves[falloff] ?? falloffCurves.linear

      itemRefs.current.forEach((item, index) => {
        if (!item) return
        const center = item.offsetTop + item.offsetHeight / 2
        const distance = Math.abs(pointerY - center)
        targetsRef.current[index] = curve(
          Math.max(0, 1 - distance / proximityRadius),
        )
      })
      startAnimation()
    },
    [falloff, proximityRadius, startAnimation],
  )

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = items.map(() => 0)
    startAnimation()
  }, [items, startAnimation])

  const handleItemClick = useCallback(
    (index: number, label: string) => {
      setActiveIndex(index)
      onItemClick?.(index, label)
    },
    [onItemClick],
  )

  useEffect(() => {
    activeIndexRef.current = activeIndex
    startAnimation()
  }, [activeIndex, startAnimation])

  useEffect(() => {
    smoothingRef.current = smoothing
  }, [smoothing])

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        // StrictMode 재마운트 후 startAnimation이 stale id를 실행 중으로 오판하지 않도록 비운다.
        animationFrameRef.current = null
      }
    },
    [],
  )

  return (
    <nav
      className={`line-sidebar${showMarker ? ' line-sidebar-with-marker' : ''}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
      style={
        {
          '--line-accent': accentColor,
          '--line-text': textColor,
          '--line-marker': markerColor,
          '--line-marker-length': `${markerLength}px`,
          '--line-marker-gap': `${markerGap}px`,
          '--line-tick-scale': tickScale,
          '--line-max-shift': `${maxShift}px`,
          '--line-item-gap': `${itemGap}px`,
          '--line-font-size': `${fontSize}rem`,
        } as CSSProperties
      }
    >
      <ul
        ref={listRef}
        className="line-sidebar-list"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {items.map((label, index) => (
          <li
            key={`${label}-${index}`}
            ref={(element) => {
              itemRefs.current[index] = element
            }}
            className={`line-sidebar-item${showMarker ? ' line-sidebar-item-with-marker' : ''}${scaleTick ? ' line-sidebar-item-scale-tick' : ''}`}
          >
            {showMarker ? (
              <span className="line-sidebar-marker" aria-hidden="true" />
            ) : null}
            <button
              type="button"
              className="line-sidebar-button"
              aria-current={activeIndex === index ? 'page' : undefined}
              disabled={disabled}
              onClick={() => handleItemClick(index, label)}
            >
              {showIndex ? (
                <span className="line-sidebar-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
              ) : null}
              <span className="line-sidebar-label">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default LineSidebar

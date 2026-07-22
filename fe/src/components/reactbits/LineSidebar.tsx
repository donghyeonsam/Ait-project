import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'

type Falloff = 'linear' | 'smooth' | 'sharp'

interface LineSidebarProps {
  items: string[]
  activeIndex?: number
  defaultActive?: number
  falloff?: Falloff
  onItemClick?: (index: number, label: string) => void
  ariaLabel?: string
  className?: string
}

const falloffCurves: Record<Falloff, (progress: number) => number> = {
  linear: (progress) => progress,
  smooth: (progress) => progress * progress * (3 - 2 * progress),
  sharp: (progress) => progress * progress * progress,
}

function getMotionDuration() {
  return Number.parseFloat(
    window
      .getComputedStyle(document.documentElement)
      .getPropertyValue('--duration-fast'),
  )
}

export function LineSidebar({
  items,
  activeIndex: controlledActiveIndex,
  defaultActive = 0,
  falloff = 'smooth',
  onItemClick,
  ariaLabel = '목록',
  className = '',
}: LineSidebarProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<Array<HTMLLIElement | null>>([])
  const targetsRef = useRef<number[]>([])
  const currentRef = useRef<number[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const frameCallbackRef = useRef<((now: number) => void) | null>(null)
  const lastFrameRef = useRef(0)
  const activeIndexRef = useRef(defaultActive)
  const [internalActiveIndex, setInternalActiveIndex] = useState(defaultActive)
  const activeIndex = controlledActiveIndex ?? internalActiveIndex

  const requestNextFrame = useCallback(() => {
    animationFrameRef.current = window.requestAnimationFrame((now) =>
      frameCallbackRef.current?.(now),
    )
  }, [])

  const runFrame = useCallback((now: number) => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const elapsed = Math.min((now - lastFrameRef.current) / 1000, 0.05)
    const smoothing = Math.max(getMotionDuration(), 1) / 1000
    const interpolation = reducedMotion
      ? 1
      : 1 - Math.exp(-elapsed / smoothing)
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
  }, [requestNextFrame])

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
      const curve = falloffCurves[falloff]

      itemRefs.current.forEach((item, index) => {
        if (!item) return
        const center = item.offsetTop + item.offsetHeight / 2
        const distance = Math.abs(pointerY - center)
        const proximity = Math.max(0, 1 - distance / 96)
        targetsRef.current[index] = curve(proximity)
      })
      startAnimation()
    },
    [falloff, startAnimation],
  )

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = items.map(() => 0)
    startAnimation()
  }, [items, startAnimation])

  const handleItemClick = (index: number, label: string) => {
    if (controlledActiveIndex === undefined) setInternalActiveIndex(index)
    onItemClick?.(index, label)
  }

  useEffect(() => {
    activeIndexRef.current = activeIndex
    startAnimation()
  }, [activeIndex, startAnimation])

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    },
    [],
  )

  return (
    <nav
      className={`line-sidebar ${className}`}
      aria-label={ariaLabel}
      style={
        {
          '--line-accent': 'var(--color-action-primary)',
          '--line-text': 'var(--color-text-secondary)',
          '--line-marker': 'var(--color-border-default)',
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
            key={index}
            ref={(element) => {
              itemRefs.current[index] = element
            }}
            className="line-sidebar-item"
          >
            <span className="line-sidebar-marker" aria-hidden="true" />
            <button
              type="button"
              className="line-sidebar-button"
              aria-current={activeIndex === index ? 'page' : undefined}
              onClick={() => handleItemClick(index, label)}
            >
              <span className="line-sidebar-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="line-sidebar-label">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

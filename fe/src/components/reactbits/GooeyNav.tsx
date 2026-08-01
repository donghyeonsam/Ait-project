import { useEffect, useId, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import '@/components/reactbits/gooey-nav.css'

export interface GooeyNavItem {
  label: string
  href: string
}

interface GooeyNavProps {
  items: GooeyNavItem[]
  /** -1이면 활성 항목 없이 알약과 파티클을 숨긴다. */
  activeIndex: number
  onSelect?: (index: number) => void
  animationTime?: number
  particleCount?: number
  particleDistances?: [number, number]
  particleR?: number
  timeVariance?: number
  className?: string
  ariaLabel?: string
}

const noise = (n = 1) => n / 2 - Math.random() * n

const getXY = (
  distance: number,
  pointIndex: number,
  totalPoints: number,
): [number, number] => {
  const angle =
    ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180)
  return [distance * Math.cos(angle), distance * Math.sin(angle)]
}

// ReactBits GooeyNav을 외부 제어(activeIndex) 방식과 SVG goo 필터 기반으로 각색해 제공한다.
export function GooeyNav({
  items,
  activeIndex,
  onSelect,
  animationTime = 500,
  particleCount = 12,
  particleDistances = [56, 8],
  particleR = 80,
  timeVariance = 250,
  className = '',
  ariaLabel = '섹션 바로가기',
}: GooeyNavProps) {
  const reduceMotion = useReducedMotion()
  const filterId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLUListElement>(null)
  const filterRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const nav = navRef.current
    const filterEl = filterRef.current
    const textEl = textRef.current
    if (!container || !nav || !filterEl || !textEl) return

    const updateEffectPosition = () => {
      const activeLi = nav.querySelectorAll('li')[activeIndex]
      if (!activeLi) return
      const containerRect = container.getBoundingClientRect()
      const pos = activeLi.getBoundingClientRect()
      const styles = {
        left: `${pos.x - containerRect.x}px`,
        top: `${pos.y - containerRect.y}px`,
        width: `${pos.width}px`,
        height: `${pos.height}px`,
      }
      Object.assign(filterEl.style, styles)
      Object.assign(textEl.style, styles)
      textEl.innerText = items[activeIndex]?.label ?? ''
    }

    const makeParticles = () => {
      const [startDistance, endDistance] = particleDistances
      const bubbleTime = animationTime * 2 + timeVariance
      filterEl.style.setProperty('--time', `${bubbleTime}ms`)

      for (let i = 0; i < particleCount; i++) {
        const time = animationTime * 2 + noise(timeVariance * 2)
        const start = getXY(startDistance, particleCount - i, particleCount)
        const end = getXY(
          endDistance + noise(7),
          particleCount - i,
          particleCount,
        )
        const rotate = noise(particleR / 10)
        filterEl.classList.remove('active')

        window.setTimeout(() => {
          const particle = document.createElement('span')
          const point = document.createElement('span')
          particle.classList.add('particle')
          particle.style.setProperty('--start-x', `${start[0]}px`)
          particle.style.setProperty('--start-y', `${start[1]}px`)
          particle.style.setProperty('--end-x', `${end[0]}px`)
          particle.style.setProperty('--end-y', `${end[1]}px`)
          particle.style.setProperty('--time', `${time}ms`)
          particle.style.setProperty('--scale', `${1 + noise(0.2)}`)
          particle.style.setProperty(
            '--color',
            `var(--gooey-color-${Math.floor(Math.random() * 4) + 1})`,
          )
          particle.style.setProperty(
            '--rotate',
            `${rotate > 0 ? (rotate + particleR / 20) * 10 : (rotate - particleR / 20) * 10}deg`,
          )

          point.classList.add('point')
          particle.appendChild(point)
          filterEl.appendChild(particle)
          requestAnimationFrame(() => filterEl.classList.add('active'))
          window.setTimeout(() => {
            try {
              filterEl.removeChild(particle)
            } catch {
              // 언마운트 등으로 이미 제거된 경우 무시한다.
            }
          }, time)
        }, 30)
      }
    }

    if (activeIndex < 0) {
      filterEl.classList.remove('active')
      textEl.classList.remove('active')
      Object.assign(filterEl.style, { width: '0px', height: '0px' })
      Object.assign(textEl.style, { width: '0px', height: '0px' })
      textEl.innerText = ''
      return
    }

    updateEffectPosition()
    textEl.classList.remove('active')
    void textEl.offsetWidth
    textEl.classList.add('active')

    filterEl.querySelectorAll('.particle').forEach((p) => p.remove())
    if (!reduceMotion) {
      makeParticles()
    }

    const resizeObserver = new ResizeObserver(updateEffectPosition)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [
    activeIndex,
    animationTime,
    items,
    particleCount,
    particleDistances,
    particleR,
    reduceMotion,
    timeVariance,
  ])

  return (
    <div className={cn('gooey-nav', className)} ref={containerRef}>
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <filter id={filterId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -12"
          />
        </filter>
      </svg>
      <nav aria-label={ariaLabel}>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li key={item.href} className={activeIndex === index ? 'active' : ''}>
              <a
                href={item.href}
                aria-current={activeIndex === index ? 'true' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  onSelect?.(index)
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span
        className="effect filter"
        style={{ filter: `url(#${filterId})` }}
        ref={filterRef}
        aria-hidden="true"
      />
      <span className="effect text" ref={textRef} aria-hidden="true" />
    </div>
  )
}

import {
  type MouseEventHandler,
  type PropsWithChildren,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps extends PropsWithChildren {
  className?: string
  spotlightColor?: `rgba(${number}, ${number}, ${number}, ${number})`
}

// ReactBits SpotlightCard를 Ait 카드 표면과 낮은 골드 불투명도에 맞춰 제공한다.
export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(201, 169, 110, 0.12)',
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  return (
    <div
      ref={cardRef}
      className={cn('landing-spotlight-card', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(0.6)}
      onMouseLeave={() => setOpacity(0)}
      onFocus={() => setOpacity(0.6)}
      onBlur={() => setOpacity(0)}
    >
      <span
        className="landing-spotlight-card__light"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 72%)`,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  )
}

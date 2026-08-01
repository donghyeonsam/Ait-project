import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import {
  useRef,
  useState,
  type PointerEventHandler,
  type PropsWithChildren,
} from 'react'
import { cn } from '@/lib/utils'

const spring = { damping: 28, stiffness: 150, mass: 1.1 }

interface DepthCardProps extends PropsWithChildren {
  className?: string
  maxRotation?: number
  maxTranslation?: number
  spotlightColor?: string
}

// ReactBits DepthCard의 포인터 3D 틸트와 스포트라이트를 자체 구현으로 제공한다.
export function DepthCard({
  children,
  className,
  maxRotation = 4.5,
  maxTranslation = 6,
  spotlightColor = 'rgba(201, 169, 110, 0.14)',
}: DepthCardProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const offsetX = useSpring(rawX, spring)
  const offsetY = useSpring(rawY, spring)
  const rotateX = useTransform(offsetY, (v) => v * -maxRotation)
  const rotateY = useTransform(offsetX, (v) => v * maxRotation)
  const x = useTransform(offsetX, (v) => v * maxTranslation)
  const y = useTransform(offsetY, (v) => v * maxTranslation)
  const [spot, setSpot] = useState({ x: 0, y: 0 })
  const [spotOpacity, setSpotOpacity] = useState(0)

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (reduceMotion || event.pointerType === 'touch' || !surfaceRef.current) {
      return
    }

    const rect = surfaceRef.current.getBoundingClientRect()
    rawX.set(((event.clientX - rect.left) / rect.width) * 2 - 1)
    rawY.set(((event.clientY - rect.top) / rect.height) * 2 - 1)
    setSpot({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    setSpotOpacity(0.65)
  }

  const reset = () => {
    rawX.set(0)
    rawY.set(0)
    setSpotOpacity(0)
  }

  return (
    <div className="landing-tilt-perspective">
      <motion.div
        ref={surfaceRef}
        className={cn('landing-tilt-surface', className)}
        style={{ rotateX, rotateY, x, y, transformStyle: 'preserve-3d' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={reset}
        onBlur={reset}
      >
        <span
          className="landing-spotlight-card__light"
          style={{
            opacity: spotOpacity,
            zIndex: 3,
            background: `radial-gradient(circle at ${spot.x}px ${spot.y}px, ${spotlightColor}, transparent 68%)`,
          }}
          aria-hidden="true"
        />
        {children}
      </motion.div>
    </div>
  )
}

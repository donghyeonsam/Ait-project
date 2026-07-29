import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion'
import {
  type PointerEventHandler,
  type PropsWithChildren,
  useRef,
} from 'react'
import { cn } from '@/lib/utils'

interface TiltedSurfaceProps extends PropsWithChildren {
  className?: string
  rotateAmplitude?: number
}

const spring = { damping: 30, stiffness: 140, mass: 1.2 }

// ReactBits TiltedCard의 포인터 기울기를 HTML 제품 미리보기 표면에 적용한다.
export function TiltedSurface({
  children,
  className,
  rotateAmplitude = 2.4,
}: TiltedSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const rotateX = useSpring(useMotionValue(0), spring)
  const rotateY = useSpring(useMotionValue(0), spring)

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (reduceMotion || event.pointerType === 'touch' || !surfaceRef.current) {
      return
    }

    const rect = surfaceRef.current.getBoundingClientRect()
    const offsetX = event.clientX - rect.left - rect.width / 2
    const offsetY = event.clientY - rect.top - rect.height / 2
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude)
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude)
  }

  const reset = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <div className="landing-tilt-perspective">
      <motion.div
        ref={surfaceRef}
        className={cn('landing-tilt-surface', className)}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={reset}
        onBlur={reset}
      >
        {children}
      </motion.div>
    </div>
  )
}

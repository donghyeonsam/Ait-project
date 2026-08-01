import {
  type CSSProperties,
  type PointerEventHandler,
  type PropsWithChildren,
  useRef,
} from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GradientBlobProps extends PropsWithChildren {
  className?: string
  width?: number | string
  height?: number | string
  speed?: number
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  baseColor?: string
  morphIntensity?: number
  enableCursorMorph?: boolean
  breathe?: boolean
  breatheDuration?: number
  opacity?: number
  rotationSpeed?: number
  autoRotate?: boolean
}

type GradientBlobStyle = CSSProperties & {
  '--gradient-blob-primary': string
  '--gradient-blob-secondary': string
  '--gradient-blob-accent': string
  '--gradient-blob-base': string
  '--gradient-blob-speed': string
  '--gradient-blob-rotation-speed': string
  '--gradient-blob-breathe-duration': string
  '--gradient-blob-morph-scale': number
  '--gradient-blob-opacity': number
  '--gradient-blob-shift-x': string
  '--gradient-blob-shift-y': string
  '--gradient-blob-rotate-x': string
  '--gradient-blob-rotate-y': string
}

function toCssSize(value: number | string) {
  return typeof value === 'number' ? `${value}px` : value
}

function positiveDuration(baseSeconds: number, multiplier: number) {
  return `${baseSeconds / Math.max(multiplier, 0.1)}s`
}

// ReactBits Gradient Blob의 형태 변형·회전·포인터 반응을 Ait 토큰에 맞춰 제공한다.
export function GradientBlob({
  children,
  className,
  width = '100%',
  height = '100%',
  speed = 1,
  primaryColor = '#1A2A4A',
  secondaryColor = '#5A7BA6',
  accentColor = '#C9A96E',
  baseColor = '#DCE6F5',
  morphIntensity = 0.65,
  enableCursorMorph = true,
  breathe = true,
  breatheDuration = 4.8,
  opacity = 1,
  rotationSpeed = 0.65,
  autoRotate = true,
}: GradientBlobProps) {
  const blobRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const clampedMorphIntensity = Math.min(Math.max(morphIntensity, 0), 1)

  const resetPointerPosition = () => {
    const element = blobRef.current
    if (!element) return

    element.style.setProperty('--gradient-blob-shift-x', '0px')
    element.style.setProperty('--gradient-blob-shift-y', '0px')
    element.style.setProperty('--gradient-blob-rotate-x', '0deg')
    element.style.setProperty('--gradient-blob-rotate-y', '0deg')
  }

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const element = blobRef.current
    if (
      !element ||
      !enableCursorMorph ||
      reduceMotion ||
      event.pointerType === 'touch'
    ) {
      return
    }

    const rect = element.getBoundingClientRect()
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5
    const movement = 14 * clampedMorphIntensity

    element.style.setProperty(
      '--gradient-blob-shift-x',
      `${relativeX * movement}px`,
    )
    element.style.setProperty(
      '--gradient-blob-shift-y',
      `${relativeY * movement}px`,
    )
    element.style.setProperty(
      '--gradient-blob-rotate-x',
      `${relativeY * -7 * clampedMorphIntensity}deg`,
    )
    element.style.setProperty(
      '--gradient-blob-rotate-y',
      `${relativeX * 7 * clampedMorphIntensity}deg`,
    )
  }

  const style: GradientBlobStyle = {
    width: toCssSize(width),
    height: toCssSize(height),
    '--gradient-blob-primary': primaryColor,
    '--gradient-blob-secondary': secondaryColor,
    '--gradient-blob-accent': accentColor,
    '--gradient-blob-base': baseColor,
    '--gradient-blob-speed': positiveDuration(7.5, speed),
    '--gradient-blob-rotation-speed': positiveDuration(18, rotationSpeed),
    '--gradient-blob-breathe-duration': `${Math.max(breatheDuration, 0.1)}s`,
    '--gradient-blob-morph-scale': 1 + clampedMorphIntensity * 0.035,
    '--gradient-blob-opacity': Math.min(Math.max(opacity, 0), 1),
    '--gradient-blob-shift-x': '0px',
    '--gradient-blob-shift-y': '0px',
    '--gradient-blob-rotate-x': '0deg',
    '--gradient-blob-rotate-y': '0deg',
  }

  return (
    <div
      ref={blobRef}
      className={cn('gradient-blob', className)}
      style={style}
      data-auto-rotate={autoRotate}
      data-breathe={breathe}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointerPosition}
      aria-hidden="true"
    >
      <span className="gradient-blob__halo" />
      <span className="gradient-blob__tilt">
        <span className="gradient-blob__surface">
          <span className="gradient-blob__material" />
          <span className="gradient-blob__shine" />
        </span>
      </span>
      {children ? <span className="gradient-blob__content">{children}</span> : null}
    </div>
  )
}

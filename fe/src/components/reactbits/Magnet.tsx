import {
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

interface MagnetProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: number
  disabled?: boolean
  magnetStrength?: number
  wrapperClassName?: string
  innerClassName?: string
}

// ReactBits Magnet을 프로젝트 모션 기준에 맞춰 작은 포인터 반응만 제공한다.
export function Magnet({
  children,
  padding = 36,
  disabled = false,
  magnetStrength = 28,
  wrapperClassName = '',
  innerClassName = '',
  ...props
}: MagnetProps) {
  const [isActive, setIsActive] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const magnetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (disabled) return

    const handlePointerMove = (event: PointerEvent) => {
      if (!magnetRef.current || event.pointerType === 'touch') return

      const { left, top, width, height } =
        magnetRef.current.getBoundingClientRect()
      const centerX = left + width / 2
      const centerY = top + height / 2
      const isNear =
        Math.abs(centerX - event.clientX) < width / 2 + padding &&
        Math.abs(centerY - event.clientY) < height / 2 + padding

      setIsActive(isNear)
      setPosition(
        isNear
          ? {
              x: (event.clientX - centerX) / magnetStrength,
              y: (event.clientY - centerY) / magnetStrength,
            }
          : { x: 0, y: 0 },
      )
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [disabled, magnetStrength, padding])

  return (
    <div
      ref={magnetRef}
      className={wrapperClassName}
      style={{ display: 'inline-block', position: 'relative' }}
      {...props}
    >
      <div
        className={innerClassName}
        style={{
          transform: `translate3d(${disabled ? 0 : position.x}px, ${disabled ? 0 : position.y}px, 0)`,
          transition: isActive
            ? 'transform 220ms cubic-bezier(0.2, 0, 0, 1)'
            : 'transform 400ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

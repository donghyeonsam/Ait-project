import type { CSSProperties } from 'react'

interface ShinyTextProps {
  text: string
  speed?: number
  className?: string
}

// reactbits.dev의 ShinyText를 Ait 몰입형 토큰에 맞게 옮긴 헤드라인 하이라이트.
export function ShinyText({ text, speed = 5, className = '' }: ShinyTextProps) {
  return (
    <span
      className={`shiny-text ${className}`.trim()}
      style={{ '--shiny-text-duration': `${speed}s` } as CSSProperties}
    >
      {text}
    </span>
  )
}

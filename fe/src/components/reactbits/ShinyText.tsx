import { motion, useReducedMotion } from 'framer-motion'

interface ShinyTextProps {
  text: string
  /** 빛이 한 번 쓸고 지나가는 시간(초). */
  speed?: number
  /** 사이클 사이 대기 시간(초). */
  delay?: number
  color?: string
  shineColor?: string
  spread?: number
  className?: string
}

// ReactBits ShinyText를 설치된 Framer Motion API와 reduced-motion 정책에 맞춰 제공한다.
export function ShinyText({
  text,
  speed = 2,
  delay = 1.8,
  // currentColor는 아래 color: transparent 지정에 따라 투명으로 해석되므로 쓰지 않는다.
  color = 'color-mix(in srgb, var(--color-surface-default) 75%, transparent)',
  shineColor = 'var(--color-surface-default)',
  spread = 120,
  className = '',
}: ShinyTextProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <span className={className}>{text}</span>
  }

  return (
    <motion.span
      className={className}
      style={{
        display: 'inline-block',
        backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
      }}
      initial={{ backgroundPosition: '150% center' }}
      animate={{ backgroundPosition: '-50% center' }}
      transition={{
        duration: speed,
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: delay,
        ease: 'linear',
      }}
    >
      {text}
    </motion.span>
  )
}

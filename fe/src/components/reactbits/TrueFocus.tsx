import { motion, useReducedMotion } from 'framer-motion'
import type { CSSProperties } from 'react'

interface TrueFocusProps {
  text: string
  delay?: number
  blurAmount?: number
  focusDuration?: number
  holdDuration?: number
  pauseDuration?: number
  loop?: boolean
  borderColor?: string
  glowColor?: string
  className?: string
}

const cornerBase: CSSProperties = {
  position: 'absolute',
  width: '0.3em',
  height: '0.3em',
  borderStyle: 'solid',
  borderWidth: 3,
  borderRadius: 3,
}

const corners: CSSProperties[] = [
  { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
]

// ReactBits TrueFocus를 단일 강조 단어에 한 번만 초점이 맞는 진입 모션으로 각색해 제공한다.
export function TrueFocus({
  text,
  delay = 0,
  blurAmount = 8,
  focusDuration = 0.6,
  holdDuration = 1,
  pauseDuration = 1.2,
  loop = false,
  borderColor = 'var(--color-status-achievement)',
  glowColor = 'color-mix(in srgb, var(--color-status-achievement) 60%, transparent)',
  className = '',
}: TrueFocusProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <span className={className}>{text}</span>
  }

  const fadeDuration = 0.4
  const cycleTotal =
    focusDuration + holdDuration + fadeDuration + (loop ? pauseDuration : 0)
  const times = [
    0,
    focusDuration / cycleTotal,
    (focusDuration + holdDuration) / cycleTotal,
    (focusDuration + holdDuration + fadeDuration) / cycleTotal,
    1,
  ]
  const repeat = loop ? Infinity : 0

  return (
    <span
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <motion.span
        style={{ display: 'inline-block', willChange: 'filter' }}
        initial={{ filter: `blur(${blurAmount}px)`, opacity: 0.65 }}
        animate={
          loop
            ? {
                filter: [
                  `blur(${blurAmount}px)`,
                  'blur(0px)',
                  'blur(0px)',
                  `blur(${blurAmount}px)`,
                  `blur(${blurAmount}px)`,
                ],
                opacity: [0.65, 1, 1, 0.65, 0.65],
              }
            : { filter: 'blur(0px)', opacity: 1 }
        }
        transition={
          loop
            ? { duration: cycleTotal, delay, times, repeat, ease: 'easeInOut' }
            : { duration: focusDuration, delay, ease: [0.2, 0, 0, 1] }
        }
      >
        {text}
      </motion.span>

      <motion.span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-0.1em -0.14em',
          pointerEvents: 'none',
        }}
        initial={{ opacity: 0, scale: 1.25 }}
        animate={{
          opacity: [0, 1, 1, 0, 0],
          scale: [1.25, 1, 1, 1, 1.25],
        }}
        transition={{
          duration: cycleTotal,
          delay,
          times,
          repeat,
          ease: 'easeOut',
        }}
      >
        {corners.map((corner, index) => (
          <span
            key={index}
            style={{
              ...cornerBase,
              ...corner,
              borderColor,
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
          />
        ))}
      </motion.span>
    </span>
  )
}

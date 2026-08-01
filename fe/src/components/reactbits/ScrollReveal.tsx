import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { useRef } from 'react'

interface RevealWordProps {
  word: string
  progress: MotionValue<number>
  range: [number, number]
  isLast: boolean
}

function RevealWord({ word, progress, range, isLast }: RevealWordProps) {
  const opacity = useTransform(progress, range, [0.15, 1])
  const filter = useTransform(progress, range, ['blur(5px)', 'blur(0px)'])

  return (
    <>
      <motion.span
        style={{
          opacity,
          filter,
          display: 'inline-block',
          willChange: 'filter, opacity',
        }}
      >
        {word}
      </motion.span>
      {isLast ? null : ' '}
    </>
  )
}

interface ScrollRevealProps {
  text: string
  className?: string
}

// ReactBits ScrollReveal을 GSAP 대신 설치된 Framer Motion 스크롤 스크럽으로 각색해 제공한다.
export function ScrollReveal({ text, className = '' }: ScrollRevealProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.92', 'start 0.55'],
  })
  const words = text.split(' ')

  if (reduceMotion) {
    return <span className={className}>{text}</span>
  }

  return (
    <span ref={ref} className={className}>
      {words.map((word, index) => (
        <RevealWord
          key={`${word}-${index}`}
          word={word}
          progress={scrollYProgress}
          range={[index / words.length, (index + 1) / words.length]}
          isLast={index === words.length - 1}
        />
      ))}
    </span>
  )
}

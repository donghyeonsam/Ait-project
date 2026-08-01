import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

interface RotatingTextProps {
  texts: readonly string[]
  /** 다음 텍스트로 넘어가는 간격(ms). */
  rotationInterval?: number
  /** 글자별 플립 시차(초). */
  staggerDuration?: number
  className?: string
}

const splitGraphemes = (text: string) => {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), (segment) => segment.segment)
  }
  return Array.from(text)
}

// ReactBits RotatingText를 설치된 Framer Motion API와 고정 폭 레이아웃에 맞춰 각색해 제공한다.
export function RotatingText({
  texts,
  rotationInterval = 3000,
  staggerDuration = 0.03,
  className = '',
}: RotatingTextProps) {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setIndex((current) => (current + 1) % texts.length),
      rotationInterval,
    )
    return () => window.clearInterval(intervalId)
  }, [rotationInterval, texts.length])

  // 가장 긴 텍스트로 폭을 예약해 회전 시 주변 레이아웃이 흔들리지 않게 한다.
  const longest = useMemo(
    () =>
      texts.reduce(
        (a, b) => (splitGraphemes(b).length > splitGraphemes(a).length ? b : a),
        texts[0],
      ),
    [texts],
  )
  const characters = useMemo(() => splitGraphemes(texts[index]), [texts, index])

  if (reduceMotion) {
    return <span className={className}>{texts[index]}</span>
  }

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        justifyContent: 'center',
      }}
    >
      <span style={{ visibility: 'hidden' }} aria-hidden="true">
        {longest}
      </span>
      <span className="sr-only">{texts[index]}</span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={index} style={{ display: 'inline-flex' }}>
            {characters.map((char, charIndex) => (
              <motion.span
                key={`${char}-${charIndex}`}
                style={{ display: 'inline-block', whiteSpace: 'pre' }}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-120%', opacity: 0 }}
                transition={{
                  type: 'spring',
                  damping: 26,
                  stiffness: 320,
                  delay: charIndex * staggerDuration,
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}

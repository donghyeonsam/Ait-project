import {
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'

interface CountUpProps {
  to: number
  from?: number
  delay?: number
  duration?: number
  className?: string
  separator?: string
  decimals?: number
}

// ReactBits CountUp을 설치된 Framer Motion API와 reduced-motion 정책에 맞춰 제공한다.
export function CountUp({
  to,
  from = 0,
  delay = 0,
  duration = 1,
  className = '',
  separator = '',
  decimals = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduceMotion = useReducedMotion()
  const motionValue = useMotionValue(reduceMotion ? to : from)
  const springValue = useSpring(motionValue, {
    damping: 20 + 40 * (1 / duration),
    stiffness: 100 * (1 / duration),
  })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  const formatValue = useCallback(
    (value: number) => {
      const formatted = Intl.NumberFormat('ko-KR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: Boolean(separator),
      }).format(value)
      return separator ? formatted.replace(/,/g, separator) : formatted
    },
    [decimals, separator],
  )

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(reduceMotion ? to : from)
    }
  }, [formatValue, from, reduceMotion, to])

  useEffect(() => {
    if (!isInView || reduceMotion) return

    const timeoutId = window.setTimeout(
      () => motionValue.set(to),
      delay * 1000,
    )
    return () => window.clearTimeout(timeoutId)
  }, [delay, isInView, motionValue, reduceMotion, to])

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest)
      }
    })
    return () => unsubscribe()
  }, [formatValue, springValue])

  return <span className={className} ref={ref} />
}

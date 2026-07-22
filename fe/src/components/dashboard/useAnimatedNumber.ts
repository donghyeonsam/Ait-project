import { useEffect, useState } from 'react'

export function useAnimatedNumber(
  target: number,
  active: boolean,
  duration = 800,
) {
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  const [value, setValue] = useState(() => (reducedMotion ? target : 0))

  useEffect(() => {
    if (!active || reducedMotion) {
      return
    }

    let animationFrame = 0
    const startedAt = performance.now()

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate)
      }
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [active, duration, reducedMotion, target])

  return reducedMotion ? target : value
}

import { useEffect, useState } from 'react'

// active가 true가 되면 0에서 target까지 easeOutCubic으로 카운트업한 값을 반환하는 훅.
export function useAnimatedNumber(
  target: number,
  active: boolean,
  duration = 800,
) {
  // 사용자가 모션 최소화를 선택했으면 애니메이션 없이 목표값을 바로 보여준다.
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

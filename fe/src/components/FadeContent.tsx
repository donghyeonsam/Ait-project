import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface FadeContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  container?: Element | string | null;
  blur?: boolean;
  duration?: number;
  ease?: string;
  delay?: number;
  threshold?: number;
  initialOpacity?: number;
  yOffset?: number;
  respectReducedMotion?: boolean;
  disappearAfter?: number;
  disappearDuration?: number;
  disappearEase?: string;
  onComplete?: () => void;
  onDisappearanceComplete?: () => void
}

const FadeContent: React.FC<FadeContentProps> = ({
  children,
  container,
  blur = false,
  duration = 1000,
  ease = 'power2.out',
  delay = 0,
  threshold = 0.1,
  initialOpacity = 0,
  yOffset = 0,
  respectReducedMotion = true,
  disappearAfter = 0,
  disappearDuration = 0.5,
  disappearEase = 'power2.in',
  onComplete,
  onDisappearanceComplete,
  className = '',
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    respectReducedMotion
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    if (!respectReducedMotion) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [respectReducedMotion])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (respectReducedMotion && prefersReducedMotion) {
      gsap.set(el, { autoAlpha: 1, y: 0, filter: 'blur(0px)' })
      return () => gsap.killTweensOf(el)
    }

    let scrollerTarget: Element | string | null =
      container || document.getElementById('snap-main-container') || null

    if (typeof scrollerTarget === 'string') {
      scrollerTarget = document.querySelector(scrollerTarget)
    }

    const startPct = (1 - threshold) * 100
    const getSeconds = (val: number) => (val > 10 ? val / 1000 : val)

    gsap.set(el, {
      autoAlpha: initialOpacity,
      y: yOffset,
      filter: blur ? 'blur(10px)' : 'blur(0px)',
      willChange: 'opacity, filter, transform',
    })

    const tl = gsap.timeline({
      paused: true,
      delay: getSeconds(delay),
      onComplete: () => {
        if (onComplete) onComplete()
        if (disappearAfter > 0) {
          gsap.to(el, {
            autoAlpha: initialOpacity,
            filter: blur ? 'blur(10px)' : 'blur(0px)',
            delay: getSeconds(disappearAfter),
            duration: getSeconds(disappearDuration),
            ease: disappearEase,
            onComplete: () => onDisappearanceComplete?.(),
          })
        }
      }
    })

    tl.to(el, {
      autoAlpha: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: getSeconds(duration),
      ease,
    })

    const st = ScrollTrigger.create({
      trigger: el,
      scroller: scrollerTarget || window,
      start: `top ${startPct}%`,
      once: true,
      onEnter: () => tl.play()
    })

    return () => {
      st.kill()
      tl.kill()
      gsap.killTweensOf(el)
    }
  }, [
    blur,
    container,
    delay,
    disappearAfter,
    disappearDuration,
    disappearEase,
    duration,
    ease,
    initialOpacity,
    onComplete,
    onDisappearanceComplete,
    prefersReducedMotion,
    respectReducedMotion,
    threshold,
    yOffset,
  ])

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}

export default FadeContent

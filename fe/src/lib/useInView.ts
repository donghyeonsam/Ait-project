import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  threshold?: number
  rootMargin?: string
}

export function useInView<T extends Element>({
  threshold = 0.2,
  rootMargin = '0px',
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || isInView) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isInView, rootMargin, threshold])

  return { ref, isInView }
}

import { useCallback, useEffect, useState } from 'react'

interface UseInViewOptions {
  threshold?: number
  rootMargin?: string
}

export function useInView<T extends Element>({
  threshold = 0.2,
  rootMargin = '0px',
}: UseInViewOptions = {}) {
  // 콜백 ref로 노드를 state에 담아야, 로딩 상태 이후에야 마운트되는 요소(비동기 데이터 로드 뒤 렌더)에서도
  // 노드가 null → 실제 엘리먼트로 바뀌는 시점에 이펙트가 다시 실행되어 옵저버가 정상적으로 붙는다.
  const [node, setNode] = useState<T | null>(null)
  const ref = useCallback((element: T | null) => {
    setNode(element)
  }, [])
  // IntersectionObserver가 없는 환경(jsdom, 구형 브라우저)에서는 즉시 노출로 폴백한다.
  const [isInView, setIsInView] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
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
  }, [node, isInView, rootMargin, threshold])

  return { ref, isInView }
}

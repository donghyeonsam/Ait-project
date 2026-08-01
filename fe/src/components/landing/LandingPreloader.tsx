import { useEffect, useState } from 'react'
import Preloader from '@/components/preloader'

const STORAGE_KEY = 'ait-landing-preloader-shown'
const HOLD_MS = 1400

// ReactBits Pro Preloader 스테어 연출을 세션당 첫 진입에 한해 보여준다.
export function LandingPreloader() {
  const [mounted, setMounted] = useState(() => {
    try {
      return (
        !window.sessionStorage.getItem(STORAGE_KEY) &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
    } catch {
      return false
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mounted) return
    const timeoutId = window.setTimeout(() => setLoading(false), HOLD_MS)
    return () => window.clearTimeout(timeoutId)
  }, [mounted])

  if (!mounted) {
    return null
  }

  const finish = () => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // 저장이 막힌 환경에서는 진입마다 보여줘도 무방하므로 무시한다.
    }
    setMounted(false)
  }

  return (
    <Preloader
      loading={loading}
      variant="stairs"
      position="fixed"
      duration={HOLD_MS}
      bgColor="#1a2a4a"
      loadingText="Ait"
      zIndex={500}
      ariaLabel="Ait 페이지를 준비하고 있어요"
      onLoadingComplete={finish}
    />
  )
}

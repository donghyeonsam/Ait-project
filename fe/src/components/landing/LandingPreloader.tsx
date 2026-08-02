import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AitIntroBackdrop } from '@/components/landing/intro/AitIntroBackdrop'
import { AitIntroLogo } from '@/components/landing/intro/AitIntroLogo'

const STORAGE_KEY = 'ait-landing-preloader-shown'
const FADE_OUT_SECONDS = 0.32

// 세션당 첫 진입에만 로고 조립 인트로를 보여주고, 완성되면 페이드 아웃으로 랜딩 화면에 넘긴다.
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
  const [visible, setVisible] = useState(true)

  const startFadeOut = useCallback(() => setVisible(false), [])

  // 이미 로고를 본 방문자가 기다리지 않도록 클릭·키 입력으로 건너뛸 수 있게 한다.
  useEffect(() => {
    if (!mounted || !visible) return

    window.addEventListener('pointerdown', startFadeOut)
    window.addEventListener('keydown', startFadeOut)

    return () => {
      window.removeEventListener('pointerdown', startFadeOut)
      window.removeEventListener('keydown', startFadeOut)
    }
  }, [mounted, visible, startFadeOut])

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
    <AnimatePresence onExitComplete={finish}>
      {visible && (
        <motion.div
          key="ait-intro"
          className="ait-intro"
          role="status"
          aria-label="Ait 페이지를 준비하고 있어요"
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_OUT_SECONDS, ease: [0.4, 0, 0.2, 1] }}
        >
          <AitIntroBackdrop />
          <AitIntroLogo onComplete={startFadeOut} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

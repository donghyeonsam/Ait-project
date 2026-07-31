import { motion } from 'framer-motion'

// 대기 화면 페이드(--duration-slow)와 같은 값. 전환 시 두 시간이 함께 움직여야 한다.
const CURTAIN_FADE_SECONDS = 0.4
// --easing-standard와 같은 곡선.
const EASE_STANDARD = [0.4, 0, 0.2, 1] as const

interface ScreenFadeCurtainProps {
  /** true면 화면을 검게 덮고, false면 장막을 걷어 화면을 드러낸다. */
  covered: boolean
  /** 마운트 시점에 이미 덮인 상태로 시작할지 여부. */
  initialCovered?: boolean
  /** 화면이 완전히 덮인 순간 호출된다. 걷힐 때는 호출되지 않는다. */
  onCoverComplete?: () => void
}

// 화면 전체를 검은 장막으로 덮거나 걷어 화면 전환을 블랙 페이드로 연출한다.
export function ScreenFadeCurtain({
  covered,
  initialCovered = false,
  onCoverComplete,
}: ScreenFadeCurtainProps) {
  return (
    <motion.div
      className="screen-fade-curtain"
      initial={{ opacity: initialCovered ? 1 : 0 }}
      animate={{ opacity: covered ? 1 : 0 }}
      transition={{ duration: CURTAIN_FADE_SECONDS, ease: EASE_STANDARD }}
      // 덮는 동안에는 아래 화면 클릭을 막고, 걷힐 때는 상호작용을 방해하지 않는다.
      style={{ pointerEvents: covered ? 'auto' : 'none' }}
      onAnimationComplete={() => {
        if (covered) onCoverComplete?.()
      }}
      aria-hidden="true"
    />
  )
}

import { motion } from 'framer-motion'
import { GradientBlob } from '@/components/reactbits/GradientBlob'

// 로고가 네이비라 배경은 밝게 유지해야 해서, 질문 생성 대기 화면과 같은 파스텔 톤을 쓴다.
const BLOB_BASE = {
  width: '100%',
  height: '100%',
  enableCursorMorph: false,
  morphIntensity: 0.5,
  // 내부 모션은 blur를 매 프레임 다시 계산시켜 인트로를 끊기게 하므로 끈다.
  breathe: false,
  autoRotate: false,
  baseColor: 'var(--color-surface-default)',
} as const

// 인트로 로고 뒤에 깔리는 블롭 레이어로, 오버레이의 파스텔 그라디언트 위에서 느리게 숨쉰다.
export function AitIntroBackdrop() {
  return (
    <motion.div
      className="ait-intro__backdrop"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="ait-intro__blob ait-intro__blob--cool">
        <GradientBlob
          {...BLOB_BASE}
          speed={0.42}
          rotationSpeed={0.32}
          breatheDuration={6.8}
          opacity={0.5}
          primaryColor="var(--color-loading-pastel-blue)"
          secondaryColor="var(--color-loading-background-blue)"
          accentColor="var(--color-loading-pastel-violet)"
        />
      </div>
      <div className="ait-intro__blob ait-intro__blob--warm">
        <GradientBlob
          {...BLOB_BASE}
          speed={0.34}
          rotationSpeed={0.24}
          breatheDuration={8.2}
          opacity={0.42}
          primaryColor="var(--color-status-achievement-surface)"
          secondaryColor="var(--color-loading-pastel-blue)"
          accentColor="var(--color-status-achievement)"
        />
      </div>
    </motion.div>
  )
}

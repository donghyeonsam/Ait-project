import { AnimatePresence, motion } from 'framer-motion'
import { formatCompactCount } from '@/lib/format'
import { EASE_OUT } from '@/lib/motion'

// 값이 바뀔 때 숫자가 아래에서 위로 밀려 올라가는 카운터.
export function RollingCounter({ value }: { value: number }) {
  return (
    <span className="relative inline-grid overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="[grid-area:1/1]"
        >
          {formatCompactCount(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

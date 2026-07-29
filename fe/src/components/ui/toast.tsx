import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT } from '@/lib/motion'

export interface ToastItem {
  id: number
  message: string
}

// 우하단 토스트 스택. 상태 관리는 lib/useToasts 훅이 담당한다.
export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 right-6 z-[var(--z-index-toast)] flex flex-col items-end gap-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.p
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15, ease: EASE_OUT } }}
            className="rounded-ait-s bg-navy-900 px-4 py-3 text-body-2 text-surface-default shadow-elevation-2"
          >
            {toast.message}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  )
}

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pageEnter } from '@/lib/motion'

// 라우트 진입 시 콘텐츠를 아래에서 살짝 떠오르며 페이드 인한다.
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={pageEnter} initial="initial" animate="animate">
      {children}
    </motion.div>
  )
}

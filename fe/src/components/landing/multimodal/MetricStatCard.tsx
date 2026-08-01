import { ScanFace } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { CountUp } from '@/components/reactbits/CountUp'

interface MetricStatCardProps {
  label: string
  value: string
  progress?: number
  highlighted: boolean
  index: number
}

// 영상 옆에서 핵심 관찰 수치를 짧은 카드로 요약한다.
export function MetricStatCard({
  label,
  value,
  progress,
  highlighted,
  index,
}: MetricStatCardProps) {
  const reduceMotion = useReducedMotion()

  return (
    <article
      className={`multimodal-stat-card${highlighted ? ' is-highlighted' : ''}`}
      style={{ '--stat-index': index } as CSSProperties}
    >
      <span>{label}</span>
      {progress !== undefined ? (
        <div className="multimodal-stat-card__gauge">
          <svg viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="33" pathLength="100" />
            <motion.circle
              className="multimodal-stat-card__gauge-value"
              cx="40"
              cy="40"
              r="33"
              initial={{ pathLength: reduceMotion ? progress / 100 : 0 }}
              whileInView={{ pathLength: progress / 100 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{
                duration: reduceMotion ? 0 : 1.15,
                delay: reduceMotion ? 0 : 0.12 + index * 0.06,
                ease: [0.2, 0, 0, 1],
              }}
            />
          </svg>
          <strong aria-label={`${label} ${progress}%`}>
            <span aria-hidden="true">
              <CountUp
                from={0}
                to={progress}
                duration={1.15}
                delay={0.12 + index * 0.06}
              />
              %
            </span>
          </strong>
        </div>
      ) : (
        <strong className="multimodal-stat-card__status">
          <ScanFace aria-hidden="true" />
          {value}
        </strong>
      )}
    </article>
  )
}

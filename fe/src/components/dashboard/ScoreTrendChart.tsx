import { useId } from 'react'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'
import { scoreTrend } from '@/mocks/dashboard'

interface ScoreTrendChartProps {
  filled?: boolean
  className?: string
}

const chart = {
  left: 54,
  right: 666,
  top: 28,
  bottom: 224,
}

const xFor = (index: number) =>
  chart.left + ((chart.right - chart.left) / (scoreTrend.length - 1)) * index

const yFor = (score: number) =>
  chart.bottom - (score / 10) * (chart.bottom - chart.top)

const linePath = scoreTrend
  .map(
    (item, index) =>
      `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(item.score)}`,
  )
  .join(' ')

const areaPath = `${linePath} L ${chart.right} ${chart.bottom} L ${chart.left} ${chart.bottom} Z`

export function ScoreTrendChart({ filled = false, className }: ScoreTrendChartProps) {
  const { ref, isInView } = useInView<HTMLDivElement>({ threshold: 0.35 })
  const gradientId = useId().replace(/:/g, '')

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <svg
        className="block h-auto w-full overflow-visible"
        viewBox="0 0 720 260"
        role="img"
        aria-labelledby={`${gradientId}-title ${gradientId}-desc`}
      >
        <title id={`${gradientId}-title`}>종합 점수 추이</title>
        <desc id={`${gradientId}-desc`}>
          7월 9일 5.5점에서 7월 21일 8.7점으로 변화한 추이입니다.
        </desc>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-area)" stopOpacity="0.78" />
            <stop offset="100%" stopColor="var(--color-chart-area)" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {[0, 2.5, 5, 7.5, 10].map((tick) => {
          const y = yFor(tick)
          return (
            <g key={tick}>
              <line
                x1={chart.left}
                x2={chart.right}
                y1={y}
                y2={y}
                stroke="var(--color-chart-grid)"
                strokeDasharray={tick === 0 ? undefined : '5 5'}
              />
              <text
                x="18"
                y={y + 4}
                fill="var(--color-text-secondary)"
                fontSize="13"
              >
                {tick}
              </text>
            </g>
          )
        })}

        {filled ? (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            className={cn('trend-area', isInView && 'is-visible')}
          />
        ) : null}

        <path
          d={linePath}
          fill="none"
          stroke="var(--color-action-primary)"
          strokeWidth="2"
          pathLength="1"
          className={cn('trend-line', isInView && 'is-visible')}
        />

        {scoreTrend.map((item, index) => {
          const x = xFor(index)
          const y = yFor(item.score)
          return (
            <g
              key={item.date}
              className={cn('trend-point', isInView && 'is-visible')}
              style={{ '--point-delay': `${180 + index * 190}ms` } as React.CSSProperties}
            >
              <circle cx={x} cy={y} r="6" fill="var(--color-action-primary)" />
              <text
                x={x}
                y={y - 13}
                textAnchor="middle"
                fill="var(--color-text-secondary)"
                fontSize="13"
              >
                {item.score.toFixed(1)}
              </text>
              <text
                x={x}
                y="250"
                textAnchor="middle"
                fill="var(--color-text-secondary)"
                fontSize="13"
              >
                {item.date}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

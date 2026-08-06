import { useId } from 'react'
import type { RadarAxis } from '@/lib/radar-axes'
import { cn } from '@/lib/utils'

// 레이더의 index번째 꼭짓점 좌표. 12시 방향(-90°)부터 시계방향으로 축 개수만큼 등분해 배치한다.
function polarPoint(index: number, radius: number, axisCount: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisCount
  return `${120 + Math.cos(angle) * radius},${110 + Math.sin(angle) * radius}`
}

const gridLevels = [24, 48, 72, 88]

// 역량 5축을 오각형 레이더로 보여준다. active가 true가 되는 순간 그려지는 애니메이션이 재생된다.
export function RadarChart({ axes, active }: { axes: RadarAxis[]; active: boolean }) {
  // 같은 화면에 레이더가 동시에 여러 개 떠 있어도(캐러셀 + 모달 등) id가 겹치지 않도록 인스턴스별로 생성한다.
  const titleId = useId()
  const descriptionId = useId()
  const dataPolygon = axes
    .map((axis, index) =>
      polarPoint(index, (Math.min(Math.max(axis.score, 0), 10) / 10) * 88, axes.length),
    )
    .join(' ')

  return (
    <div className="relative mx-auto w-full max-w-56">
      <svg
        viewBox="0 0 240 220"
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>역량 분석</title>
        <desc id={descriptionId}>
          {axes.map((axis) => `${axis.label} ${axis.score.toFixed(1)}점`).join(', ')}
          입니다.
        </desc>
        {gridLevels.map((radius) => (
          <polygon
            key={radius}
            points={axes.map((_, index) => polarPoint(index, radius, axes.length)).join(' ')}
            fill="none"
            stroke="var(--color-chart-grid)"
          />
        ))}
        {axes.map((_, index) => (
          <line
            key={index}
            x1="120"
            y1="110"
            x2={polarPoint(index, 88, axes.length).split(',')[0]}
            y2={polarPoint(index, 88, axes.length).split(',')[1]}
            stroke="var(--color-chart-grid)"
          />
        ))}
        <polygon
          points={dataPolygon}
          fill="var(--color-radar-fill)"
          stroke="var(--color-radar-stroke)"
          strokeWidth="2"
          className={cn('radar-polygon', active && 'is-visible')}
        />
        {axes.map((axis, index) => {
          const [x, y] = polarPoint(index, 111, axes.length).split(',').map(Number)
          return (
            <g key={axis.label} className={cn('radar-label', active && 'is-visible')}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-text-secondary)"
                fontSize="13"
              >
                {axis.label}
              </text>
              <text
                x={x}
                y={y + 15}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-text-primary)"
                fontSize="12"
                fontWeight="600"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {axis.score.toFixed(1)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

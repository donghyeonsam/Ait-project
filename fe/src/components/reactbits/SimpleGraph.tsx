import { type CSSProperties, useId } from 'react'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'

export interface SimpleGraphDataPoint {
  value: number
  label?: string
}

interface SimpleGraphProps {
  data: SimpleGraphDataPoint[]
  className?: string
  title?: string
  description?: string
  lineColor?: string
  dotColor?: string
  width?: string | number
  height?: number
  animationDuration?: number
  showGrid?: boolean
  gridStyle?: 'solid' | 'dashed' | 'dotted'
  gridLines?: 'vertical' | 'horizontal' | 'both'
  gridLineThickness?: number
  showDots?: boolean
  dotSize?: number
  dotHoverGlow?: boolean
  curved?: boolean
  gradientFade?: boolean
  graphLineThickness?: number
  calculatePercentageDifference?: boolean
  animateOnScroll?: boolean
  minValue?: number
  maxValue?: number
  tickCount?: number
  valueFormatter?: (value: number) => string
}

interface GraphPoint extends SimpleGraphDataPoint {
  x: number
  y: number
}

type SimpleGraphStyle = CSSProperties & {
  '--simple-graph-line-color': string
  '--simple-graph-dot-color': string
  '--simple-graph-animation-duration': string
  '--simple-graph-area-delay': string
}

const viewBox = {
  width: 720,
  height: 260,
  left: 58,
  right: 674,
  top: 28,
  bottom: 220,
}

function toCssSize(value: string | number) {
  return typeof value === 'number' ? `${value}px` : value
}

function xFor(index: number, count: number) {
  return count <= 1
    ? (viewBox.left + viewBox.right) / 2
    : viewBox.left +
        ((viewBox.right - viewBox.left) / (count - 1)) * index
}

function createCurvedPath(points: GraphPoint[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  const segments = points.slice(0, -1).map((point, index) => {
    const previous = points[index - 1] ?? point
    const next = points[index + 1]
    const afterNext = points[index + 2] ?? next
    const controlOneX = point.x + (next.x - previous.x) / 6
    const controlOneY = point.y + (next.y - previous.y) / 6
    const controlTwoX = next.x - (afterNext.x - point.x) / 6
    const controlTwoY = next.y - (afterNext.y - point.y) / 6

    return `C ${controlOneX} ${controlOneY} ${controlTwoX} ${controlTwoY} ${next.x} ${next.y}`
  })

  return `M ${points[0].x} ${points[0].y} ${segments.join(' ')}`
}

function createStraightPath(points: GraphPoint[]) {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
    )
    .join(' ')
}

function percentageLabel(
  value: number,
  previousValue: number | undefined,
  valueFormatter: (value: number) => string,
) {
  if (previousValue === undefined || previousValue === 0) {
    return valueFormatter(value)
  }

  const difference = ((value - previousValue) / Math.abs(previousValue)) * 100
  if (Math.abs(difference) < 0.05) return '― 0%'
  return `${difference > 0 ? '↑' : '↓'} ${Math.abs(difference).toFixed(1)}%`
}

// ReactBits Simple Graph의 곡선·그라데이션·점 상호작용을 대시보드용 SVG로 제공한다.
export function SimpleGraph({
  data,
  className,
  title = '데이터 추이',
  description = '기간별 데이터 변화를 나타낸 그래프입니다.',
  lineColor = 'var(--color-action-primary)',
  dotColor = 'var(--color-action-primary)',
  width = '100%',
  height = 260,
  animationDuration = 1.4,
  showGrid = true,
  gridStyle = 'dashed',
  gridLines = 'horizontal',
  gridLineThickness = 1,
  showDots = true,
  dotSize = 7,
  dotHoverGlow = true,
  curved = true,
  gradientFade = true,
  graphLineThickness = 3,
  calculatePercentageDifference = false,
  animateOnScroll = true,
  minValue,
  maxValue,
  tickCount = 5,
  valueFormatter = (value) => String(value),
}: SimpleGraphProps) {
  const { ref, isInView } = useInView<HTMLDivElement>({ threshold: 0.35 })
  const id = useId().replace(/:/g, '')
  const values = data.map((point) => point.value)
  const resolvedMin = minValue ?? Math.min(0, ...values)
  const initialMax = maxValue ?? Math.max(1, ...values)
  const resolvedMax = initialMax === resolvedMin ? resolvedMin + 1 : initialMax
  const range = resolvedMax - resolvedMin
  const isActive = !animateOnScroll || isInView
  const gridDash =
    gridStyle === 'dashed' ? '6 6' : gridStyle === 'dotted' ? '1 7' : undefined
  const safeTickCount = Math.max(2, tickCount)
  const ticks = Array.from({ length: safeTickCount }, (_, index) => {
    const ratio = index / (safeTickCount - 1)
    return resolvedMin + range * ratio
  })
  const points: GraphPoint[] = data.map((point, index) => ({
    ...point,
    x: xFor(index, data.length),
    y:
      viewBox.bottom -
      ((Math.min(Math.max(point.value, resolvedMin), resolvedMax) -
        resolvedMin) /
        range) *
        (viewBox.bottom - viewBox.top),
  }))
  const linePath = curved
    ? createCurvedPath(points)
    : createStraightPath(points)
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${viewBox.bottom} L ${points[0].x} ${viewBox.bottom} Z`
    : ''
  const style: SimpleGraphStyle = {
    width: toCssSize(width),
    // svg는 width:100%·height:auto로 viewBox 비율(720:260)에 맞춰 늘어나므로,
    // 세로 길이를 높이가 아닌 그 비율의 최대 가로폭으로 제한해야 카드 밖으로 넘치지 않는다.
    maxWidth: `${(height * viewBox.width) / viewBox.height}px`,
    '--simple-graph-line-color': lineColor,
    '--simple-graph-dot-color': dotColor,
    '--simple-graph-animation-duration': `${Math.max(animationDuration, 0.1)}s`,
    '--simple-graph-area-delay': `${Math.max(animationDuration, 0.1) * 0.72}s`,
  }

  if (data.length === 0) {
    return (
      <div
        ref={ref}
        className={cn('simple-graph', className)}
        style={style}
        role="img"
        aria-label={`${title}. 표시할 데이터가 없습니다.`}
      />
    )
  }

  return (
    <div
      ref={ref}
      className={cn('simple-graph', isActive && 'is-active', className)}
      style={style}
    >
      <svg
        className="simple-graph__svg"
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        role="group"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-description`}>{description}</desc>
        <defs>
          <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
            <stop offset="72%" stopColor={lineColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {showGrid &&
        (gridLines === 'horizontal' || gridLines === 'both')
          ? ticks.map((tick) => {
              const y =
                viewBox.bottom -
                ((tick - resolvedMin) / range) *
                  (viewBox.bottom - viewBox.top)
              return (
                <g key={tick} className="simple-graph__grid-group">
                  <line
                    x1={viewBox.left}
                    x2={viewBox.right}
                    y1={y}
                    y2={y}
                    stroke="var(--color-chart-grid)"
                    strokeWidth={gridLineThickness}
                    strokeDasharray={gridDash}
                    strokeLinecap={gridStyle === 'dotted' ? 'round' : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text x="18" y={y + 4} className="simple-graph__axis-label">
                    {valueFormatter(tick)}
                  </text>
                </g>
              )
            })
          : null}

        {showGrid && (gridLines === 'vertical' || gridLines === 'both')
          ? points.map((point, index) => (
              <line
                key={`${point.label ?? index}-grid`}
                x1={point.x}
                x2={point.x}
                y1={viewBox.top}
                y2={viewBox.bottom}
                stroke="var(--color-chart-grid)"
                strokeWidth={gridLineThickness}
                strokeDasharray={gridDash}
                strokeLinecap={gridStyle === 'dotted' ? 'round' : undefined}
                vectorEffect="non-scaling-stroke"
              />
            ))
          : null}

        {gradientFade && points.length > 1 ? (
          <path
            d={areaPath}
            fill={`url(#${id}-area)`}
            className="simple-graph__area"
          />
        ) : null}

        {points.length > 1 ? (
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth={graphLineThickness}
            strokeLinecap="round"
            strokeLinejoin="round"
            // 점이 2~3개뿐이라 곡선을 이루는 세그먼트 수가 적으면, pathLength를 1로 두었을 때
            // 브라우저의 길이 근사 오차가 커져 선이 마지막 점 앞에서 살짝 끊겨 보일 수 있다.
            // 훨씬 큰 정수로 정규화해 근사 오차의 상대적 비중을 줄인다.
            pathLength="1000"
            vectorEffect="non-scaling-stroke"
            className="simple-graph__line"
          />
        ) : null}

        {points.map((point, index) => {
          const displayValue = calculatePercentageDifference
            ? percentageLabel(
                point.value,
                data[index - 1]?.value,
                valueFormatter,
              )
            : valueFormatter(point.value)
          return (
            <g
              key={`${point.label ?? 'point'}-${index}`}
              className="simple-graph__point"
              style={
                {
                  '--simple-graph-point-delay': `${
                    160 + index * 140
                  }ms`,
                } as CSSProperties
              }
              tabIndex={showDots ? 0 : undefined}
              role={showDots ? 'img' : undefined}
              aria-label={
                showDots
                  ? `${point.label ?? `${index + 1}번째 데이터`}, ${displayValue}`
                  : undefined
              }
            >
              {showDots ? (
                <>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={Math.max(dotSize * 2.4, 18)}
                    className="simple-graph__point-hit-area"
                  />
                  {dotHoverGlow ? (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={dotSize * 2.1}
                      fill={dotColor}
                      className="simple-graph__dot-glow"
                    />
                  ) : null}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={dotSize}
                    fill={dotColor}
                    stroke="var(--color-surface-default)"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    className="simple-graph__dot"
                  />
                </>
              ) : null}
              <text
                x={point.x}
                y={point.y - dotSize - 10}
                textAnchor="middle"
                className="simple-graph__value-label"
              >
                {displayValue}
              </text>
              {point.label ? (
                <text
                  x={point.x}
                  y="250"
                  textAnchor="middle"
                  className="simple-graph__axis-label simple-graph__x-label"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

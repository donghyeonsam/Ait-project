import { motion, useReducedMotion } from 'framer-motion'
import { CountUp } from '@/components/reactbits/CountUp'
import {
  studyEvaluationCategories,
  type StudyEvaluationCategory,
} from '@/mocks/study'

export type StudyEvaluationScores = Record<StudyEvaluationCategory, number>

interface StudyEvaluationRadarProps {
  scores: StudyEvaluationScores
  /** 그래프 위에 붙는 설명. 세션 중 입력값과 누적 평균을 구분하기 위해 화면마다 다르게 준다. */
  caption?: string
  /** 지정하면 그래프 우측 상단에 평균 점수 배지를 띄운다. */
  averageScore?: number
}

const center = { x: 130, y: 112 }
const chartRadius = 72
const gridLevels = [0.25, 0.5, 0.75, 1]

function polarPoint(index: number, radius: number) {
  const angle =
    -Math.PI / 2 +
    (Math.PI * 2 * index) / studyEvaluationCategories.length
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  }
}

function polygonPoints(radius: number) {
  return studyEvaluationCategories
    .map((_, index) => {
      const point = polarPoint(index, radius)
      return `${point.x},${point.y}`
    })
    .join(' ')
}

// 다섯 평가 점수를 동일한 축 순서로 연결하고 값 변경 시 꼭짓점을 부드럽게 이동시킨다.
export function StudyEvaluationRadar({
  scores,
  caption = '실시간 역량 그래프',
  averageScore,
}: StudyEvaluationRadarProps) {
  const reduceMotion = useReducedMotion()
  const scorePoints = studyEvaluationCategories.map((category, index) =>
    polarPoint(index, (scores[category] / 10) * chartRadius),
  )
  const scorePolygon = scorePoints
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 170, damping: 24 }

  return (
    <figure className="relative rounded-ait-m border border-border-default bg-surface-default px-3 py-4 shadow-elevation-1">
      {typeof averageScore === 'number' ? (
        <div
          className="absolute bottom-3 right-3 flex items-baseline"
          aria-label={`5개 항목 평균 ${averageScore.toFixed(1)}점`}
        >
          <span className="mr-1 text-caption font-medium text-text-secondary">평균</span>
          <span className="text-h3 font-bold tabular-nums text-status-achievement">
            <CountUp from={5} to={averageScore} duration={0.38} decimals={1} />
          </span>
          <span className="text-caption font-medium text-text-secondary">점</span>
        </div>
      ) : null}

      <figcaption className="text-center text-body-2 font-semibold text-text-primary">
        {caption}
      </figcaption>
      <svg
        viewBox="0 0 260 230"
        className="mx-auto mt-2 block h-auto w-full max-w-72 overflow-visible"
        role="img"
        aria-labelledby="study-evaluation-radar-title study-evaluation-radar-description"
      >
        <title id="study-evaluation-radar-title">팀원 평가 방사형 그래프</title>
        <desc id="study-evaluation-radar-description">
          {studyEvaluationCategories
            .map((category) => `${category} ${scores[category]}점`)
            .join(', ')}
        </desc>

        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(chartRadius * level)}
            fill={
              level === 1
                ? 'color-mix(in srgb, var(--color-status-achievement-surface) 45%, transparent)'
                : 'none'
            }
            stroke="var(--color-chart-grid)"
            strokeWidth="1"
          />
        ))}

        {studyEvaluationCategories.map((category, index) => {
          const endpoint = polarPoint(index, chartRadius)
          return (
            <line
              key={category}
              x1={center.x}
              y1={center.y}
              x2={endpoint.x}
              y2={endpoint.y}
              stroke="var(--color-chart-grid)"
              strokeWidth="1"
            />
          )
        })}

        <motion.polygon
          initial={false}
          animate={{ points: scorePolygon }}
          transition={transition}
          fill="var(--color-radar-fill)"
          stroke="var(--color-radar-stroke)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {scorePoints.map((point, index) => (
          <motion.circle
            key={studyEvaluationCategories[index]}
            initial={false}
            animate={{ cx: point.x, cy: point.y }}
            transition={transition}
            r="3.5"
            fill="var(--color-surface-default)"
            stroke="var(--color-radar-stroke)"
            strokeWidth="2"
          />
        ))}

        {studyEvaluationCategories.map((category, index) => {
          const labelPoint = polarPoint(index, 98)
          return (
            <text
              key={category}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--color-text-secondary)"
              fontSize="11"
              fontWeight="600"
            >
              {category}
            </text>
          )
        })}
      </svg>
    </figure>
  )
}

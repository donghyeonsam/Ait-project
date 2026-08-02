import { Gauge } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import SimpleGraph from '@/components/simple-graph'
import { answerPaceData } from '@/components/landing/multimodal/multimodal-analysis.data'

interface AnswerPaceCardProps {
  highlighted: boolean
}

// 구간별 말하기 속도와 권장 범위를 비교 가능한 그래프로 보여준다.
export function AnswerPaceCard({ highlighted }: AnswerPaceCardProps) {
  const reduceMotion = useReducedMotion()

  return (
    <article
      className={`multimodal-pace-card${highlighted ? ' is-highlighted' : ''}`}
      aria-labelledby="multimodal-pace-title"
    >
      <header>
        <div>
          <Gauge aria-hidden="true" />
          <h4 id="multimodal-pace-title">답변 속도</h4>
        </div>
        <strong>152 WPM</strong>
      </header>
      <div
        className="multimodal-pace-card__graph"
        role="img"
        aria-label="3분 동안 말하기 속도가 110에서 176 WPM 사이로 변한 예시 그래프"
      >
        <span className="multimodal-pace-card__range" aria-hidden="true" />
        <SimpleGraph
          data={answerPaceData.map((point) => ({ ...point }))}
          lineColor="#1A2A4A"
          dotColor="#1A2A4A"
          height={150}
          showGrid
          gridStyle="dashed"
          gridLines="horizontal"
          gridLineThickness={1}
          dotSize={5}
          curved={false}
          gradientFade={false}
          graphLineThickness={2}
          animationDuration={reduceMotion ? 0 : 2}
          animateOnScroll={!reduceMotion}
          animateOnce
        />
      </div>
      <div className="multimodal-pace-card__ticks" aria-hidden="true">
        {answerPaceData.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
      <div className="multimodal-pace-card__legend">
        <span><i /> 말하기 속도</span>
        <span><i /> 권장 범위 120–180 WPM</span>
      </div>
    </article>
  )
}

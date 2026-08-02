import { AudioLines } from 'lucide-react'
import type { CSSProperties } from 'react'
import { voiceRhythmMetrics } from '@/components/landing/multimodal/multimodal-analysis.data'

interface VoiceRhythmCardProps {
  highlighted: boolean
}

const rhythmWaveBars = [
  24, 42, 66, 48, 78, 56, 34, 72, 88, 52, 38, 68, 92, 58, 40, 74, 84,
  50, 32, 64, 90, 60, 42, 76, 86, 54, 36, 70, 82, 48, 30, 62, 78, 52,
  38, 68, 74, 46, 28,
]

// 음성 파형과 세 가지 발화 지표를 한 카드에서 함께 보여준다.
export function VoiceRhythmCard({ highlighted }: VoiceRhythmCardProps) {
  return (
    <article
      className={`multimodal-rhythm-card${highlighted ? ' is-highlighted' : ''}`}
      aria-labelledby="multimodal-rhythm-title"
    >
      <header>
        <div>
          <AudioLines aria-hidden="true" />
          <h4 id="multimodal-rhythm-title">음성 리듬</h4>
        </div>
        <span>{highlighted ? '집중 보기' : '실시간 예시'}</span>
      </header>
      <div
        className="multimodal-rhythm-card__wave"
        role="img"
        aria-label="계속 변화하는 답변 음성의 크기와 리듬 예시"
      >
        {rhythmWaveBars.map((height, index) => (
          <i
            key={`${height}-${index}`}
            style={
              {
                '--wave-height': `${height}%`,
                '--wave-delay': `${index * -0.055}s`,
                '--wave-duration': `${0.9 + (index % 5) * 0.12}s`,
              } as CSSProperties
            }
            aria-hidden="true"
          />
        ))}
      </div>
      <dl>
        {voiceRhythmMetrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

import waveformImage from '@/assets/landing/multimodal/waveform.svg'
import type { MultimodalMetricId } from '@/components/landing/multimodal/multimodal-analysis.data'

interface GazeAnalysisOverlayProps {
  metricId: MultimodalMetricId
}

// 선택 지표에 맞는 관찰 포인트를 영상 위에 장식 레이어로 표시한다.
export function GazeAnalysisOverlay({ metricId }: GazeAnalysisOverlayProps) {
  if (metricId === 'gaze') {
    return (
      <div className="multimodal-gaze-points" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    )
  }

  /* 표정 분석 포인트는 현재 노출하지 않는다.
  if (metricId === 'expression') {
    return (
      <div
        className="multimodal-expression-points"
        aria-hidden="true"
      >
        {Array.from({ length: 10 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    )
  }
  */

  if (metricId === 'voice') {
    return (
      <img
        className="multimodal-visual-overlay multimodal-visual-overlay--wave"
        src={waveformImage}
        alt=""
        width="720"
        height="180"
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="multimodal-pace-overlay" aria-hidden="true">
      <i />
      <i />
      <i />
      <span>120–180 WPM</span>
    </div>
  )
}

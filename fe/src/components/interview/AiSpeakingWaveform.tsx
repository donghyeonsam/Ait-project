import { useEffect, useState } from 'react'

const BAR_COUNT = 20
const SPEAKING_DURATION_MS = 2600

export function AiSpeakingWaveform() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), SPEAKING_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) {
    return null
  }

  return (
    <div
      className="flex items-center gap-2 rounded-ait-pill border border-border-default bg-surface-default px-4 py-2 shadow-elevation-1"
      role="status"
      aria-live="polite"
    >
      <span className="text-caption font-medium text-text-secondary">AI 면접관 답변 중</span>
      <div className="flex h-5 items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }).map((_, index) => (
          <span
            key={index}
            className="waveform-bar w-0.5 rounded-full bg-action-primary"
            style={{ animationDelay: `${(index % 7) * 90}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

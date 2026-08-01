import { AudioLines, Eye, Gauge, ScanFace, type LucideIcon } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import ParallaxCarousel, {
  type ParallaxCarouselRef,
} from '@/components/parallax-carousel'
import type {
  MultimodalMetric,
  MultimodalMetricId,
} from '@/components/landing/multimodal/multimodal-analysis.data'

const metricIcons: Record<MultimodalMetricId, LucideIcon> = {
  gaze: Eye,
  expression: ScanFace,
  voice: AudioLines,
  pace: Gauge,
}

function useMobileCarousel() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 47.999rem)')
    const update = () => setIsMobile(mediaQuery.matches)

    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return isMobile
}

interface MultimodalMetricSelectorProps {
  metrics: readonly MultimodalMetric[]
  activeId: MultimodalMetricId
  onSelect: (id: MultimodalMetricId) => void
}

// 네 가지 분석 지표를 키보드와 포인터로 하나씩 선택하게 한다.
export function MultimodalMetricSelector({
  metrics,
  activeId,
  onSelect,
}: MultimodalMetricSelectorProps) {
  const isMobile = useMobileCarousel()
  const reduceMotion = useReducedMotion()
  const carouselRef = useRef<ParallaxCarouselRef>(null)

  const selectMetric = (id: MultimodalMetricId, index: number) => {
    onSelect(id)
    carouselRef.current?.scrollToIndex(index)
  }

  return (
    <>
      <div
        className="multimodal-selector multimodal-selector--desktop"
        aria-label="멀티모달 분석 지표"
      >
        {metrics.map((metric, index) => {
          const Icon = metricIcons[metric.id]
          const selected = metric.id === activeId

          return (
            <button
              key={metric.id}
              type="button"
              className={selected ? 'is-selected' : undefined}
              aria-pressed={selected}
              aria-controls="multimodal-preview-panel"
              onClick={() => selectMetric(metric.id, index)}
            >
              <span className="multimodal-selector__thumbnail">
                <img
                  src={metric.thumbnailSrc}
                  alt=""
                  width={metric.thumbnailWidth}
                  height={metric.thumbnailHeight}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className="multimodal-selector__copy">
                <span>
                  <Icon aria-hidden="true" />
                  <strong>{metric.label}</strong>
                  {selected && <small>분석 중</small>}
                </span>
                <span>{metric.description}</span>
              </span>
              <span className="multimodal-selector__state" aria-hidden="true">
                <i />
              </span>
            </button>
          )
        })}
      </div>

      {isMobile && (
        <div className="multimodal-selector--mobile">
          <div className="multimodal-mobile-carousel" aria-hidden="true">
            {reduceMotion ? (
              <div className="multimodal-mobile-carousel__static">
                {metrics.map((metric) => (
                  <img
                    key={metric.id}
                    src={metric.thumbnailSrc}
                    alt=""
                    width={metric.thumbnailWidth}
                    height={metric.thumbnailHeight}
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
            ) : (
              <ParallaxCarousel
                ref={carouselRef}
                images={metrics.map((metric) => metric.thumbnailSrc)}
                imageWidth={220}
                imageHeight={150}
                gap={12}
                parallaxIntensity={0.14}
                uvScale={0.94}
                lerp={0.1}
                wheelSensitivity={0.6}
                dragSensitivity={1}
                loop={false}
                autoplaySpeed={0}
                pauseOnHover
                showProgress={false}
                borderRadius={12}
              />
            )}
          </div>
          <div
            className="multimodal-mobile-tabs"
            aria-label="멀티모달 분석 지표"
          >
            {metrics.map((metric, index) => {
              const Icon = metricIcons[metric.id]
              const selected = metric.id === activeId

              return (
                <button
                  key={metric.id}
                  type="button"
                  className={selected ? 'is-selected' : undefined}
                  aria-pressed={selected}
                  aria-controls="multimodal-preview-panel"
                  onClick={() => selectMetric(metric.id, index)}
                >
                  <Icon aria-hidden="true" />
                  <span>{metric.label}</span>
                </button>
              )
            })}
          </div>
          <p>{metrics.find((metric) => metric.id === activeId)?.description}</p>
        </div>
      )}
    </>
  )
}

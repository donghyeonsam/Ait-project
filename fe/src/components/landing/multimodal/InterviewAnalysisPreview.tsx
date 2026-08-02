import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import DepthCard from '@/components/depth-card'
import Preloader from '@/components/preloader'
import interviewCandidateImage from '@/assets/landing/multimodal/interview-candidate.webp'
import { AnswerPaceCard } from '@/components/landing/multimodal/AnswerPaceCard'
import { GazeAnalysisOverlay } from '@/components/landing/multimodal/GazeAnalysisOverlay'
import { MetricStatCard } from '@/components/landing/multimodal/MetricStatCard'
import type {
  MultimodalMetric,
  MultimodalMetricId,
} from '@/components/landing/multimodal/multimodal-analysis.data'
import { multimodalStatMetrics } from '@/components/landing/multimodal/multimodal-analysis.data'
import { VoiceRhythmCard } from '@/components/landing/multimodal/VoiceRhythmCard'

interface InterviewAnalysisPreviewProps {
  metric: MultimodalMetric
}

// 선택한 관찰 지표에 따라 영상, 오버레이와 보조 분석 카드를 함께 갱신한다.
export function InterviewAnalysisPreview({
  metric,
}: InterviewAnalysisPreviewProps) {
  const reduceMotion = useReducedMotion()
  const [candidateReady, setCandidateReady] = useState(false)

  useEffect(() => {
    let active = true
    const image = new Image()
    image.src = interviewCandidateImage

    const markReady = () => {
      if (active) setCandidateReady(true)
    }

    image.decode().then(markReady).catch(markReady)
    return () => {
      active = false
    }
  }, [])

  const depthLayers = useMemo(
    () => [{ image: metric.previewSrc, depth: 0 }],
    [metric],
  )

  return (
    <article
      className="multimodal-product-card"
      id="multimodal-preview-panel"
      aria-live="polite"
    >
      <header className="multimodal-product-card__topbar">
        <div className="multimodal-product-card__brand">
          <img
            src="/Logo_Assets/web/ait-logo-horizontal.webp"
            alt="Ait"
            width="1024"
            height="468"
            loading="lazy"
            decoding="async"
          />
          <i aria-hidden="true" />
          <span>
            <strong>{metric.title}</strong>
            <small>{metric.previewDescription}</small>
          </span>
        </div>
        <span className="multimodal-product-card__live">
          <i aria-hidden="true" />
          분석 중
        </span>
      </header>

      <div className="multimodal-product-card__body">
        <div className="multimodal-product-card__main">
          <div className="multimodal-video-shell">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={metric.id}
                className="multimodal-video-transition"
                initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.995 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.2, 0, 0, 1] }}
              >
                <DepthCard
                  className="multimodal-depth-card"
                  title={metric.title}
                  description={metric.previewDescription}
                  image={metric.previewSrc}
                  imageAlt={metric.previewAlt}
                  layers={depthLayers}
                  width={960}
                  height={540}
                  maxRotation={2.5}
                  maxTranslation={5}
                  borderRadius="14px"
                  disableOnMobile
                  respectReducedMotion
                  spotlight={false}
                  ariaLabel={`${metric.label} 분석 영상 예시`}
                />
                <GazeAnalysisOverlay metricId={metric.id} />
                <span className="multimodal-video-shell__badge">
                  시선처리 및 표정분석 관찰 예시
                </span>
              </motion.div>
            </AnimatePresence>
            <Preloader
              loading={!candidateReady}
              variant="curtain"
              position="absolute"
              duration={600}
              bgColor="#1A2A4A"
              loadingText="Ait 분석 화면을 준비하고 있어요"
              textClassName="multimodal-video-preloader__text"
              showProgressBar={false}
              zIndex={3}
              respectReducedMotion
              reducedMotionFallback="fade"
              ariaLabel="Ait 면접 분석 화면을 준비하고 있어요"
            />
          </div>

          <div className="multimodal-stat-list" aria-label="주요 관찰 수치">
            {multimodalStatMetrics.map((stat, index) => (
              <MetricStatCard
                key={stat.id}
                label={stat.label}
                value={stat.value}
                progress={'progress' in stat ? stat.progress : undefined}
                highlighted={stat.emphasisFor.includes(
                  metric.id as MultimodalMetricId,
                )}
                index={index}
              />
            ))}
          </div>
        </div>

        <div className="multimodal-product-card__charts">
          <VoiceRhythmCard highlighted={metric.id === 'voice'} />
          <AnswerPaceCard highlighted={metric.id === 'pace'} />
        </div>
        <p className="multimodal-product-card__note">
          화면의 분석 수치는 기능 이해를 위한 예시예요.
        </p>
      </div>
    </article>
  )
}

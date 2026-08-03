import { ThemeProvider } from 'next-themes'
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import BlurText from '@/components/BlurText'
import CenterFlow from '@/components/center-flow'
import FadeContent from '@/components/FadeContent'
import { InterviewAnalysisPreview } from '@/components/landing/multimodal/InterviewAnalysisPreview'
import { MultimodalMetricSelector } from '@/components/landing/multimodal/MultimodalMetricSelector'
import {
  multimodalMetrics,
  type MultimodalMetricId,
} from '@/components/landing/multimodal/multimodal-analysis.data'

// 시선, 표정, 음성과 답변 속도를 제품형 인터랙션으로 소개한다.
export function MultimodalAnalysisSection() {
  const reduceMotion = useReducedMotion()
  const [activeId, setActiveId] = useState<MultimodalMetricId>('gaze')
  const activeMetric = useMemo(
    () =>
      multimodalMetrics.find((metric) => metric.id === activeId) ??
      multimodalMetrics[0],
    [activeId],
  )

  return (
    <section
      className="multimodal-section"
      id="multimodal-analysis"
      aria-labelledby="multimodal-analysis-title"
    >
      <div className="landing-shell multimodal-section__shell">
        <header className="multimodal-section__heading">
          <div
            className="multimodal-section__title"
            id="multimodal-analysis-title"
            role="heading"
            aria-level={2}
          >
            <BlurText
              text="AI는 면접에서 무엇을 관찰할까요?"
              animateBy="words"
              delay={reduceMotion ? 0 : 55}
              direction="bottom"
              threshold={0.2}
              stepDuration={reduceMotion ? 0.01 : 0.3}
              animationFrom={
                reduceMotion
                  ? { filter: 'blur(0px)', opacity: 1, y: 0 }
                  : { filter: 'blur(8px)', opacity: 0, y: 16 }
              }
              animationTo={[
                { filter: 'blur(0px)', opacity: 1, y: 0 },
              ]}
            />
          </div>
          <FadeContent
            className="multimodal-section__description"
            duration={reduceMotion ? 0.01 : 600}
            delay={reduceMotion ? 0 : 120}
            yOffset={reduceMotion ? 0 : 16}
            respectReducedMotion
            threshold={0.2}
          >
            시선부터 답변 속도까지, 면접의 모든 순간을 정교하게 분석해요.
          </FadeContent>
        </header>

        <div className="multimodal-section__layout">
          <MultimodalMetricSelector
            metrics={multimodalMetrics}
            activeId={activeId}
            onSelect={setActiveId}
          />

          <div className="multimodal-section__preview-wrap">
            <div
              className="multimodal-section__flow"
              aria-hidden="true"
            >
              {!reduceMotion && (
                <ThemeProvider
                  defaultTheme="light"
                  enableSystem={false}
                  forcedTheme="light"
                  storageKey="ait-multimodal-theme"
                >
                  <CenterFlow
                  nodeItems={multimodalMetrics.map((metric) => ({
                    content: (
                      <img
                        key={metric.id}
                        src={metric.thumbnailSrc}
                        alt=""
                        width={metric.thumbnailWidth}
                        height={metric.thumbnailHeight}
                        loading="lazy"
                        decoding="async"
                      />
                    ),
                  }))}
                  centerContent={<strong>Ait AI</strong>}
                  centerSize={88}
                  nodeSize={48}
                  nodeDistance={0.72}
                  pulseDuration={5}
                  pulseInterval={9}
                  pulseLength={0.24}
                  lineWidth={1}
                  pulseWidth={1}
                  pulseSoftness={3}
                  lineColorLight="#DCE3EE"
                  pulseColorLight="#C9A96E"
                  glowColorLight="#C9A96E"
                  maxGlowIntensity={5}
                  disableBlinking
                  />
                </ThemeProvider>
              )}
            </div>

            <motion.div
              className="multimodal-section__product"
              initial={
                reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }
              }
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: reduceMotion ? 0.2 : 0.72,
                ease: [0.2, 0, 0, 1],
              }}
            >
              <InterviewAnalysisPreview metric={activeMetric} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

import {
  MessageCircle,
  Sparkles,
  ThumbsUp,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { ThemeProvider } from 'next-themes'
import type { CSSProperties } from 'react'
import CenterFlow from '@/components/center-flow'
import {
  features,
  LANDING_ASSET_ROOT,
} from '@/components/landing/landing.data'
import { ScrollReveal } from '@/components/reactbits/ScrollReveal'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'

const featureWaveform = [
  28, 46, 68, 38, 76, 54, 34, 84, 62, 42, 70, 48, 32, 78, 58, 36, 66,
  44,
]

function SoloInterviewVisual() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="landing-feature-visual landing-feature-visual--solo">
      <span>Q1. 자신을 가장 잘 보여주는 경험을 말씀해 주세요.</span>
      <div className="landing-feature-wave" aria-label="답변 음성 파형">
        {featureWaveform.map((height, index) => (
          <motion.i
            key={`${height}-${index}`}
            style={{ height: `${height}%` }}
            animate={
              reduceMotion ? undefined : { scaleY: [0.58, 1, 0.7, 0.9] }
            }
            transition={{
              duration: 1.2 + (index % 3) * 0.16,
              repeat: Number.POSITIVE_INFINITY,
              delay: index * 0.04,
            }}
          />
        ))}
      </div>
      <p>
        <span className="landing-feature-pulse" aria-hidden="true" />
        AI 면접관이 답변을 듣고 있어요
      </p>
    </div>
  )
}

function StudyVisual() {
  const people = [
    {
      src: `${LANDING_ASSET_ROOT}/people/interviewee-primary.webp`,
      alt: '그룹 스터디 참가자 예시 1',
    },
    {
      src: `${LANDING_ASSET_ROOT}/people/study-member-female.webp`,
      alt: '그룹 스터디 참가자 예시 2',
    },
    {
      src: `${LANDING_ASSET_ROOT}/people/study-member-male.webp`,
      alt: '그룹 스터디 참가자 예시 3',
    },
  ]

  return (
    <div className="landing-feature-visual landing-feature-visual--study">
      <div className="landing-study-people">
        {people.map((person) => (
          <div key={person.src}>
            <img
              src={person.src}
              alt={person.alt}
              width="220"
              height="220"
              loading="lazy"
            />
            <span>
              <i aria-hidden="true" />
              LIVE
            </span>
          </div>
        ))}
      </div>
      <p>피드백이 실시간으로 공유되고 있어요.</p>
      <div className="landing-study-reactions" aria-label="스터디 반응 예시">
        <span>
          <ThumbsUp aria-hidden="true" /> 12
        </span>
        <span>
          <MessageCircle aria-hidden="true" /> 5
        </span>
      </div>
    </div>
  )
}

function AnalysisVisual() {
  return (
    <div className="landing-feature-visual landing-feature-visual--analysis">
      <div className="landing-analysis-photo">
        <img
          src={`${LANDING_ASSET_ROOT}/people/study-member-female.webp`}
          alt="표정과 시선 분석 예시"
          width="440"
          height="520"
          loading="lazy"
        />
        <span className="landing-face-frame" aria-hidden="true" />
        {Array.from({ length: 14 }, (_, index) => (
          <i
            key={index}
            className={`landing-face-dot landing-face-dot--${index + 1}`}
            style={{ animationDelay: `${((index * 0.37) % 2.6).toFixed(2)}s` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <div
        className="landing-analysis-score"
        style={{ '--score': 89 } as CSSProperties}
      >
        <span>종합 점수</span>
        <strong>89</strong>
        <small>/ 100</small>
      </div>
      <ul>
        <li><span>아이컨택</span><strong>86</strong></li>
        <li><span>표정</span><strong>82</strong></li>
        <li><span>음성</span><strong>91</strong></li>
        <li><span>속도</span><strong>88</strong></li>
      </ul>
    </div>
  )
}

function ReportVisual() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="landing-feature-visual landing-feature-visual--report">
      <div className="landing-report-heading">
        <span>성장 추이</span>
        <strong>최근 5회</strong>
      </div>
      <svg viewBox="0 0 320 150" role="img" aria-label="최근 다섯 번의 면접 점수가 꾸준히 상승한 그래프">
        <g className="landing-report-grid" aria-hidden="true">
          <path d="M34 25H304M34 58H304M34 91H304M34 124H304" />
        </g>
        <motion.path
          className="landing-report-area"
          d="M38 115 L98 91 L158 70 L218 52 L296 20 L296 126 L38 126 Z"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={
            reduceMotion ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }
          }
          viewport={{ once: false, amount: 0.5 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  duration: 4.4,
                  times: [0, 0.26, 0.42, 0.82, 1],
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }
          }
        />
        <motion.path
          className="landing-report-line"
          d="M38 115 L98 91 L158 70 L218 52 L296 20"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          whileInView={
            reduceMotion
              ? { pathLength: 1, opacity: 1 }
              : { pathLength: [0, 1, 1, 0], opacity: [1, 1, 1, 0] }
          }
          viewport={{ once: false, amount: 0.5 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  duration: 4.4,
                  times: [0, 0.36, 0.82, 1],
                  repeat: Number.POSITIVE_INFINITY,
                  ease: [0.2, 0, 0.2, 1],
                }
          }
        />
        {[['38','115'],['98','91'],['158','70'],['218','52'],['296','20']].map(
          ([cx, cy], index) => (
            <motion.circle
              key={cx}
              cx={cx}
              cy={cy}
              r="5"
              aria-hidden="true"
              initial={reduceMotion ? false : { opacity: 0, scale: 0 }}
              whileInView={
                reduceMotion
                  ? { opacity: 1, scale: 1 }
                  : {
                      opacity: [0, 0, 1, 1, 0],
                      scale: [0, 0, 1, 1, 0],
                    }
              }
              viewport={{ once: false, amount: 0.5 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 4.4,
                      times: [
                        0,
                        0.04 + index * 0.075,
                        0.095 + index * 0.075,
                        0.82,
                        1,
                      ],
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeOut',
                    }
              }
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          ),
        )}
      </svg>
      <div className="landing-report-keywords">
        <span>문제 해결</span>
        <span>협업</span>
        <span>도전</span>
        <span>성장</span>
      </div>
    </div>
  )
}

const visuals = {
  solo: SoloInterviewVisual,
  study: StudyVisual,
  analysis: AnalysisVisual,
  report: ReportVisual,
}

// 핵심 기능 네 가지를 동일한 밀도의 제품형 카드로 소개한다.
export function FeatureGrid() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="landing-section landing-features" id="features" aria-labelledby="features-title">
      <div className="landing-shell">
        <div className="landing-section-heading">
          <p>
            <Sparkles aria-hidden="true" />
            모든 기능을 하나의 플랫폼에서
          </p>
          <h2 id="features-title">
            <ScrollReveal text="면접 준비, Ait 하나로 끝내세요" />
          </h2>
          <span>연습부터 분석과 성장 기록까지 자연스럽게 이어집니다.</span>
        </div>

        {/* OS 다크 모드가 감지되면 다크 분기로 그려지므로 시스템 테마를 끄고 라이트로 고정한다. */}
        <div className="landing-features__hub" aria-hidden="true">
          <ThemeProvider
            defaultTheme="light"
            enableSystem={false}
            forcedTheme="light"
            storageKey="ait-landing-theme"
          >
            <CenterFlow
              nodeItems={features.map(({ id, title, icon: Icon }) => ({
                content: (
                  <span key={id} className="landing-features__hub-node">
                    <Icon aria-hidden="true" />
                    {title}
                  </span>
                ),
              }))}
              centerContent={
                <strong className="landing-features__hub-center">Ait</strong>
              }
              centerSize={92}
              nodeSize={96}
              nodeDistance={0.75}
              pulseDuration={2.2}
              pulseInterval={2.5}
              pulseLength={0.5}
              lineWidth={2}
              pulseWidth={2.5}
              pulseSoftness={4}
              baseGlow={12}
              syncPulses
              lineColor="#d3d9e3"
              lineColorLight="#d3d9e3"
              pulseColor="#c9a96e"
              pulseColorLight="#c9a96e"
              glowColor="#c9a96e"
              glowColorLight="#c9a96e"
              borderRadius={22}
            />
          </ThemeProvider>
        </div>

        <motion.div
          className="landing-feature-grid"
          initial={reduceMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.16 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.07 } },
          }}
        >
          {features.map((feature) => {
            const Visual = visuals[feature.id]
            const Icon = feature.icon

            return (
              <motion.div
                key={feature.id}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.45, ease: [0.2, 0, 0, 1] },
                  },
                }}
              >
                <SpotlightCard className="landing-feature-card">
                  <div className="landing-feature-card__heading">
                    <span className="landing-feature-card__icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <p>{feature.eyebrow}</p>
                      <h3>{feature.title}</h3>
                    </div>
                  </div>
                  <p className="landing-feature-card__description">
                    {feature.description}
                  </p>
                  <Visual />
                </SpotlightCard>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

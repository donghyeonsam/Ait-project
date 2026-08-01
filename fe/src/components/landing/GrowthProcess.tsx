import { ArrowRight, Sparkles } from 'lucide-react'
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { growthSteps } from '@/components/landing/landing.data'
import { ScrollReveal } from '@/components/reactbits/ScrollReveal'
import { cn } from '@/lib/utils'

// CSS의 landing-process-timer 애니메이션 길이와 맞춰야 한다.
const STEP_INTERVAL_MS = 3400

const demoWave = [42, 74, 56, 88, 64, 92, 58, 78, 70, 84]

const demoMeters = [
  { label: '아이컨택', value: 82 },
  { label: '음성', value: 76 },
  { label: '속도', value: 88 },
] as const

// 활성 단계 카드 안에서 재생되는 단계별 미니 데모. 스타일은 is-active 계층으로 제어한다.
function StepDemo({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div
        className="landing-process__demo landing-process__demo--wave"
        aria-hidden="true"
      >
        {demoWave.map((height, barIndex) => (
          <i
            key={barIndex}
            style={{
              height: `${height}%`,
              animationDelay: `${barIndex * 90}ms`,
            }}
          />
        ))}
      </div>
    )
  }

  if (index === 1) {
    return (
      <div
        className="landing-process__demo landing-process__demo--meters"
        aria-hidden="true"
      >
        {demoMeters.map(({ label, value }, meterIndex) => (
          <span key={label}>
            <small>{label}</small>
            <b>
              <i
                style={{
                  '--meter-width': `${value}%`,
                  transitionDelay: `${350 + meterIndex * 140}ms`,
                } as CSSProperties}
              />
            </b>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div
      className="landing-process__demo landing-process__demo--spark"
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 36" preserveAspectRatio="none">
        <path pathLength={1} d="M4 30 L28 24 L52 26 L76 16 L100 12 L116 4" />
      </svg>
    </div>
  )
}

interface ProcessConnectorProps {
  progress: MotionValue<number>
  range: [number, number]
  showPulse: boolean
}

// 스크롤 진행에 비례해 연결선이 그려지고, 다음 단계가 점등될 때 골드 펄스가 흘러간다.
function ProcessConnector({ progress, range, showPulse }: ProcessConnectorProps) {
  const reduceMotion = useReducedMotion()
  const scaleX = useTransform(progress, range, [0, 1])

  return (
    <span className="landing-process__connector" aria-hidden="true">
      <motion.i
        style={
          reduceMotion ? undefined : { scaleX, transformOrigin: 'left center' }
        }
      />
      <ArrowRight />
      {showPulse && !reduceMotion ? (
        <motion.span
          className="landing-process__pulse"
          initial={{ left: '-4%', opacity: 0 }}
          animate={{ left: '86%', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 0.55,
            ease: 'easeInOut',
            opacity: { duration: 0.55, times: [0, 0.2, 0.8, 1] },
          }}
        />
      ) : null}
    </span>
  )
}

// 연습에서 개선으로 이어지는 Ait의 반복 성장 흐름을 세 단계 순환 점등으로 안내한다.
export function GrowthProcess() {
  const listRef = useRef<HTMLOListElement>(null)
  const reduceMotion = useReducedMotion()
  const isInView = useInView(listRef, { amount: 0.35 })
  const [activeStep, setActiveStep] = useState(0)
  // 마우스를 올린 단계는 순환을 멈추고 고정 활성화한다.
  const [pinnedStep, setPinnedStep] = useState<number | null>(null)

  useEffect(() => {
    if (reduceMotion || !isInView || pinnedStep !== null) return

    const intervalId = window.setInterval(
      () => setActiveStep((current) => (current + 1) % growthSteps.length),
      STEP_INTERVAL_MS,
    )
    return () => window.clearInterval(intervalId)
  }, [reduceMotion, isInView, pinnedStep])

  const currentStep = pinnedStep ?? activeStep

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ['start 0.85', 'start 0.35'],
  })

  return (
    <section className="landing-section landing-process" id="process" aria-labelledby="process-title">
      <div className="landing-shell">
        <div className="landing-section-heading">
          <p>
            <Sparkles aria-hidden="true" />
            단계별로 체계적인 면접 준비
          </p>
          <h2 id="process-title">
            <ScrollReveal text="Ait와 함께하는 3단계 성장 프로세스" />
          </h2>
          <span>한 번의 결과보다, 반복할수록 보이는 변화를 중요하게 생각합니다.</span>
        </div>

        <motion.ol
          ref={listRef}
          className="landing-process__list"
          initial={reduceMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.28 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {growthSteps.map(({ number, title, description, icon: Icon }, index) => (
            <motion.li
              key={number}
              className={cn(!reduceMotion && currentStep === index && 'is-active')}
              onMouseEnter={() => {
                setPinnedStep(index)
                setActiveStep(index)
              }}
              onMouseLeave={() => setPinnedStep(null)}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.42, ease: [0.2, 0, 0, 1] },
                },
              }}
            >
              <div className="landing-process__heading">
                <span className="landing-process__icon"><Icon aria-hidden="true" /></span>
                <div>
                  <p>STEP {number}</p>
                  <h3>{title}</h3>
                </div>
              </div>
              <p className="landing-process__desc">{description}</p>
              <StepDemo index={index} />
              {index < growthSteps.length - 1 ? (
                <ProcessConnector
                  progress={scrollYProgress}
                  range={[index * 0.5, index * 0.5 + 0.5]}
                  showPulse={!reduceMotion && currentStep === index + 1}
                />
              ) : null}
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}

import {
  ArrowRight,
  AudioLines,
  CheckCircle2,
  Clock3,
  Mic2,
  Pause,
  Play,
  Radio,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { demoFeedback } from '@/components/landing/landing.data'

const demoWaveform = [
  30, 48, 72, 42, 84, 62, 36, 74, 92, 52, 80, 44, 66, 34, 76, 56, 38,
  70, 48, 82, 58, 40, 68, 46,
]

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${rest
    .toString()
    .padStart(2, '0')}`
}

// 실제 녹음 없이 답변 상태를 조작하며 Ait의 분석 흐름을 체험하는 로컬 데모다.
export function InteractiveDemo() {
  const reduceMotion = useReducedMotion()
  const [isAnswering, setIsAnswering] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isAnswering) return

    const intervalId = window.setInterval(() => {
      setElapsed((current) => (current >= 99 ? 0 : current + 1))
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [isAnswering])

  const timerLabel = useMemo(() => formatTime(elapsed), [elapsed])

  return (
    <section
      className="landing-demo"
      id="demo"
      aria-labelledby="landing-demo-title"
    >
      <div className="landing-shell landing-demo__grid">
        <motion.div
          className="landing-demo__intro"
          initial={reduceMotion ? false : { opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
        >
          <p className="landing-demo__eyebrow">
            <Radio aria-hidden="true" />
            인터랙티브 데모
          </p>
          <h2 id="landing-demo-title">
            AI 모의면접을
            <br />
            직접 경험해보세요
          </h2>
          <p>
            실전과 닮은 환경에서 질문을 확인하고, 답변 후 제공되는 피드백
            구조를 미리 살펴보세요.
          </p>
          <ul>
            <li><Clock3 aria-hidden="true" /> 실시간 질문 확인</li>
            <li><AudioLines aria-hidden="true" /> 음성 답변 반응</li>
            <li><CheckCircle2 aria-hidden="true" /> 즉시 피드백 예시</li>
          </ul>
          <button
            type="button"
            className="landing-demo__start"
            onClick={() => setIsAnswering(true)}
            disabled={isAnswering}
          >
            {isAnswering ? '답변 체험 중' : '데모 체험 시작하기'}
            <ArrowRight aria-hidden="true" />
          </button>
        </motion.div>

        <motion.div
          className="landing-demo__stage"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.24 }}
          transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.08 }}
        >
          <div className="landing-demo__stage-top">
            <span>AI 모의면접 데모</span>
            <span>질문 2 / 5</span>
          </div>
          <p className="landing-demo__question">
            Q2. 지원 직무에 관심을 갖게 된 계기와 준비 과정을 말씀해 주세요.
          </p>

          <button
            type="button"
            className={`landing-demo__voice ${isAnswering ? 'is-active' : ''}`}
            aria-pressed={isAnswering}
            aria-label={
              isAnswering
                ? `답변 체험 중, ${timerLabel}, 답변 마치기`
                : '답변 체험 시작하기'
            }
            onClick={() => setIsAnswering((current) => !current)}
          >
            <span className="landing-demo__voice-ring" aria-hidden="true" />
            <Mic2 aria-hidden="true" />
            <strong>
              {isAnswering ? '답변하고 있어요' : '답변을 시작해보세요'}
            </strong>
            <span className="landing-demo__voice-wave" aria-hidden="true">
              {demoWaveform.map((height, index) => (
                <i
                  key={`${height}-${index}`}
                  style={{
                    height: `${height}%`,
                    animationDelay: `${index * 45}ms`,
                  }}
                />
              ))}
            </span>
            <time dateTime={`PT${elapsed}S`}>{timerLabel}</time>
          </button>

          <button
            type="button"
            className="landing-demo__pause"
            onClick={() => setIsAnswering((current) => !current)}
          >
            {isAnswering ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            {isAnswering ? '답변 마치기' : '답변 시작'}
          </button>
          <small>
            체험용 화면으로, 마이크 입력이나 답변 데이터는 수집하지 않습니다.
          </small>
        </motion.div>

        <motion.aside
          className="landing-demo__feedback"
          aria-label="AI 피드백 체험 예시"
          initial={reduceMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.24 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <div className="landing-demo__feedback-title">
            <span>AI 피드백</span>
            <small>체험 예시</small>
          </div>
          <ul>
            {demoFeedback.map(({ icon: Icon, title, description }) => (
              <motion.li
                key={title}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.35 },
                  },
                }}
              >
                <span><Icon aria-hidden="true" /></span>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </motion.li>
            ))}
          </ul>
          <div className="landing-demo__score">
            <div>
              <span>예상 점수</span>
              <strong>82</strong>
              <small>/ 100</small>
            </div>
            <div>
              <strong>GOOD</strong>
              <span><i /></span>
              <small>근거와 개선 행동을 함께 확인할 수 있어요.</small>
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  )
}

import {
  AudioWaveform,
  Check,
  Eye,
  Gauge,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { LANDING_ASSET_ROOT } from '@/components/landing/landing.data'

const waveformBars = [
  32, 52, 74, 40, 88, 62, 34, 70, 94, 46, 78, 54, 38, 86, 64, 42, 72,
  50, 82, 36, 68, 44,
]

const feedback = [
  {
    icon: Check,
    label: '강점',
    text: '답변의 핵심과 근거가 자연스럽게 이어져요.',
  },
  {
    icon: Sparkles,
    label: '개선',
    text: '마지막에 배운 점을 한 문장 더해보세요.',
  },
  {
    icon: Lightbulb,
    label: '제안',
    text: '경험을 STAR 흐름으로 정리해보세요.',
  },
]

// 히어로의 AI 면접 제품 경험을 실제 HTML 정보 구조로 보여준다.
export function InterviewPreview() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="landing-preview-wrap" aria-label="AI 모의면접 화면 미리보기">
      <img
        src={`${LANDING_ASSET_ROOT}/decor/hero-orbits.svg`}
        alt=""
        className="landing-preview-orbits"
        aria-hidden="true"
      />
      <img
        src={`${LANDING_ASSET_ROOT}/decor/dot-grid.svg`}
        alt=""
        className="landing-preview-dots"
        aria-hidden="true"
      />
      <img
        src={`${LANDING_ASSET_ROOT}/decor/gold-spark.svg`}
        alt=""
        className="landing-preview-spark"
        aria-hidden="true"
      />

      <div className="landing-preview">
        <div className="landing-preview__topbar">
          <div>
            <span className="landing-preview__brand">AI 모의면접</span>
            <span className="landing-preview__role">프론트엔드 개발자</span>
          </div>
          <span className="landing-preview__step">질문 3 / 5</span>
        </div>

        <div className="landing-preview__body">
          <div className="landing-preview__video-column">
            <div className="landing-preview__video">
              <img
                src={`${LANDING_ASSET_ROOT}/people/interviewee-primary.webp`}
                alt="AI 모의면접에 참여 중인 지원자 예시"
                width="480"
                height="520"
                loading="eager"
                fetchPriority="high"
              />
              <div className="landing-preview__live">
                <span aria-hidden="true" />
                LIVE
              </div>
              <time className="landing-preview__timer" dateTime="PT8M45S">
                00:08:45
              </time>
            </div>

            <div className="landing-waveform landing-waveform--light" aria-label="답변 음성 파형">
              {waveformBars.map((height, index) => (
                <motion.span
                  key={`${height}-${index}`}
                  style={{ height: `${height}%` }}
                  animate={
                    reduceMotion
                      ? undefined
                      : { scaleY: [0.62, 1, 0.72, 0.9] }
                  }
                  transition={{
                    duration: 1.1 + (index % 4) * 0.14,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                    delay: index * 0.035,
                  }}
                />
              ))}
            </div>

            <div className="landing-preview__scores">
              <div>
                <span>
                  <Eye aria-hidden="true" />
                  아이컨택
                </span>
                <strong>86점</strong>
                <div className="landing-preview__progress">
                  <span style={{ width: '86%' }} />
                </div>
              </div>
              <div>
                <span>
                  <Gauge aria-hidden="true" />
                  자신감 지수
                </span>
                <strong>78%</strong>
                <svg viewBox="0 0 112 34" role="img" aria-label="자신감 지수 상승 추이">
                  <path d="M2 29 L19 19 L36 23 L54 9 L72 16 L91 7 L110 3" />
                </svg>
              </div>
            </div>
          </div>

          <div className="landing-preview__content">
            <div className="landing-preview__answer">
              <div className="landing-preview__tabs" aria-label="면접 답변 정보">
                <span className="is-active">답변 내용</span>
                <span>질문</span>
              </div>
              <p>
                저는 새로운 문제를 마주했을 때 원인을 구조화하고, 작은
                단위로 검증하며 해결해 나갑니다.
              </p>
              <p>
                이 과정에서 팀원들과 적극적으로 소통해 다양한 관점을
                수렴하고 더 나은 결과를 만들었습니다.
              </p>
              <time dateTime="PT8M45S">00:08:45</time>
            </div>

            <div className="landing-preview__feedback">
              <div className="landing-preview__feedback-title">
                <AudioWaveform aria-hidden="true" />
                <strong>AI 피드백</strong>
                <span>체험 예시</span>
              </div>
              <ul>
                {feedback.map(({ icon: Icon, label, text }) => (
                  <li key={label}>
                    <span className="landing-preview__feedback-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{label}</strong>
                      <p>{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

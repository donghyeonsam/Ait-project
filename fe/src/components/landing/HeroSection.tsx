import { ArrowRight, Play, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { InterviewPreview } from '@/components/landing/InterviewPreview'
import {
  heroMetrics,
  landingRoutes,
} from '@/components/landing/landing.data'
import { CountUp } from '@/components/reactbits/CountUp'
import { Magnet } from '@/components/reactbits/Magnet'

const lineVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

// 랜딩 첫 화면. 핵심 가치, 진입 행동, 제품 미리보기와 지표를 전달한다.
export function HeroSection() {
  const reduceMotion = useReducedMotion()
  const initial = reduceMotion ? false : 'hidden'

  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="landing-shell landing-hero__grid">
        <div className="landing-hero__copy">
          <motion.p
            className="landing-eyebrow"
            initial={initial}
            animate="visible"
            variants={lineVariants}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          >
            <Sparkles aria-hidden="true" />
            AI 기반 실전 면접 트레이닝
          </motion.p>

          <motion.h1
            id="landing-hero-title"
            className="landing-hero__title"
            initial={initial}
            animate="visible"
            transition={{ staggerChildren: 0.06, delayChildren: 0.08 }}
          >
            <motion.span variants={lineVariants}>연습할수록,</motion.span>
            <motion.span variants={lineVariants}>
              면접은 더 <em>선명</em>해집니다
            </motion.span>
          </motion.h1>

          <motion.p
            className="landing-hero__description"
            initial={
              reduceMotion ? false : { opacity: 0, y: 10, filter: 'blur(6px)' }
            }
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 0.45,
              delay: reduceMotion ? 0 : 0.2,
              ease: [0.2, 0, 0, 1],
            }}
          >
            AI가 당신의 답변을 분석하고, 강점은 강화하며
            <br className="landing-desktop-break" />
            보완점은 구체적으로 알려드립니다.
            <br />
            실전처럼 연습하고, 데이터로 성장하세요.
          </motion.p>

          <motion.div
            className="landing-hero__actions"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.28 }}
          >
            <Magnet disabled={Boolean(reduceMotion)}>
              <Link className="landing-button landing-button--primary" to={landingRoutes.start}>
                무료로 면접 시작하기
                <ArrowRight aria-hidden="true" />
              </Link>
            </Magnet>
            <a className="landing-button landing-button--text" href="#demo">
              <Play aria-hidden="true" />
              데모 둘러보기
            </a>
          </motion.div>
        </div>

        <motion.div
          className="landing-hero__preview"
          initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.65,
            delay: reduceMotion ? 0 : 0.12,
            ease: [0.2, 0, 0, 1],
          }}
        >
          <InterviewPreview />
        </motion.div>

        <motion.ul
          className="landing-hero__metrics"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.36 }}
        >
          {heroMetrics.map(({ value, suffix, label, icon: Icon }) => (
            <li key={label}>
              <span className="landing-hero__metric-icon">
                <Icon aria-hidden="true" />
              </span>
              <span>
                <strong>
                  <CountUp to={value} duration={1} separator="," />
                  {suffix}
                </strong>
                <small>{label}</small>
              </span>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

import { ArrowRight, Play } from 'lucide-react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { InterviewPreview } from '@/components/landing/InterviewPreview'
import { landingRoutes } from '@/components/landing/landing.data'
import { Magnet } from '@/components/reactbits/Magnet'
import { ShinyText } from '@/components/reactbits/ShinyText'
import { TrueFocus } from '@/components/reactbits/TrueFocus'

const lineVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

// 랜딩 첫 화면. 핵심 가치, 진입 행동, 제품 미리보기와 지표를 전달한다.
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const initial = reduceMotion ? false : 'hidden'

  // 히어로가 화면 밖으로 밀려나는 동안 미리보기가 살짝 물러나며 다음 섹션에 시선을 넘긴다.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const previewScale = useTransform(scrollYProgress, [0, 1], [1, 0.94])
  const previewOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.35])
  const previewY = useTransform(scrollYProgress, [0, 1], [0, -24])

  return (
    <section
      ref={sectionRef}
      className="landing-hero"
      aria-labelledby="landing-hero-title"
    >
      <div className="landing-shell landing-hero__grid">
        <div className="landing-hero__copy">
          <motion.h1
            id="landing-hero-title"
            className="landing-hero__title"
            initial={initial}
            animate="visible"
            transition={{ staggerChildren: 0.06, delayChildren: 0.08 }}
          >
            <motion.span variants={lineVariants}>연습할수록,</motion.span>
            <motion.span variants={lineVariants}>
              면접은 더{' '}
              <em>
                <TrueFocus text="선명" delay={0.55} loop />
              </em>
              해집니다
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
                <ShinyText text="무료로 면접 시작하기" />
                <ArrowRight aria-hidden="true" />
              </Link>
            </Magnet>
            <a className="landing-button landing-button--text" href="#gallery">
              <Play aria-hidden="true" />
              화면 미리보기
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
          {/* 진입 모션(부모)과 transform이 겹치지 않도록 스크롤 후퇴는 별도 레이어에서 처리한다. */}
          <motion.div
            style={
              reduceMotion
                ? undefined
                : {
                    scale: previewScale,
                    opacity: previewOpacity,
                    y: previewY,
                  }
            }
          >
            <InterviewPreview />
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}

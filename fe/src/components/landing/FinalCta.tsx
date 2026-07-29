import {
  ArrowRight,
  Check,
  Play,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  finalBenefits,
  landingRoutes,
} from '@/components/landing/landing.data'
import { Magnet } from '@/components/reactbits/Magnet'

// 랜딩 여정의 마지막에 가입과 데모 확인 행동을 한 번 더 제공한다.
export function FinalCta() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="landing-final" aria-labelledby="landing-final-title">
      <div className="landing-shell">
        <motion.div
          className="landing-final__card"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.32 }}
          transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
        >
          <div className="landing-final__main">
            <div>
              <p>READY TO PRACTICE?</p>
              <h2 id="landing-final-title">
                지금 바로, 첫 면접 연습을 시작하세요
              </h2>
              <span>회원가입만으로 Ait의 주요 기능을 무료로 경험할 수 있습니다.</span>
            </div>
            <div className="landing-final__actions">
              <Magnet disabled={Boolean(reduceMotion)}>
                <Link className="landing-button landing-button--primary" to={landingRoutes.start}>
                  무료로 면접 시작하기
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Magnet>
              <a className="landing-button landing-button--secondary" href="#demo">
                <Play aria-hidden="true" />
                데모 둘러보기
              </a>
            </div>
          </div>
          <ul className="landing-final__benefits">
            {finalBenefits.map((benefit) => (
              <li key={benefit}>
                <Check aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}

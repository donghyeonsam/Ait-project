import { ArrowRight, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { growthSteps } from '@/components/landing/landing.data'

// 연습에서 개선으로 이어지는 Ait의 반복 성장 흐름을 세 단계로 안내한다.
export function GrowthProcess() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="landing-section landing-process" aria-labelledby="process-title">
      <div className="landing-shell">
        <div className="landing-section-heading">
          <p>
            <Sparkles aria-hidden="true" />
            단계별로 체계적인 면접 준비
          </p>
          <h2 id="process-title">Ait와 함께하는 3단계 성장 프로세스</h2>
          <span>한 번의 결과보다, 반복할수록 보이는 변화를 중요하게 생각합니다.</span>
        </div>

        <motion.ol
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
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.42, ease: [0.2, 0, 0, 1] },
                },
              }}
            >
              <span className="landing-process__number">{number}</span>
              <span className="landing-process__icon"><Icon aria-hidden="true" /></span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              {index < growthSteps.length - 1 ? (
                <span className="landing-process__connector" aria-hidden="true">
                  <i />
                  <ArrowRight />
                </span>
              ) : null}
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}

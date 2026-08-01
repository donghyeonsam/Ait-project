import { Sparkles } from 'lucide-react'
import ClickStack from '@/components/click-stack'
import { showcaseQuestions } from '@/components/landing/landing.data'
import { RotatingText } from '@/components/reactbits/RotatingText'

const rotatingFields = showcaseQuestions.map(({ field }) => field)

// 직무별 실전 질문 예시를 클릭할 때마다 다음 장이 나타나는 카드 스택으로 보여준다.
export function QuestionShowcase() {
  return (
    <section
      className="landing-section landing-questions"
      aria-labelledby="questions-title"
    >
      <div className="landing-shell">
        <div className="landing-section-heading">
          <p>
            <Sparkles aria-hidden="true" />
            실전 질문 미리보기
          </p>
          <h2 id="questions-title">
            <RotatingText
              className="landing-questions__rotate"
              texts={rotatingFields}
            />{' '}
            질문으로 연습하게 됩니다
          </h2>
          <span>직무별 기출 유형을 바탕으로 AI가 질문을 이어갑니다.</span>
        </div>

        <div
          className="landing-questions__stack"
          aria-label="직무별 면접 질문 예시 카드 묶음"
        >
          <ClickStack
            items={showcaseQuestions.map(
              ({ id, field, question, tags }, index) => (
                <article className="landing-questions__card" key={id}>
                  <span
                    className="landing-questions__index"
                    aria-hidden="true"
                  >
                    {`0${index + 1}`}
                  </span>
                  <span className="landing-questions__field">{field}</span>
                  <p>{question}</p>
                  <div className="landing-questions__tags">
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </article>
              ),
            )}
            cardWidth={480}
            cardHeight={272}
            spreadX={26}
            spreadY={18}
            visibleCount={4}
            borderRadius={14}
            cardColor="#ffffff"
            shadowOpacity={0.16}
          />
        </div>
        <p className="landing-questions__hint">
          카드를 클릭하면 다음 질문이 나타납니다.
        </p>
      </div>
    </section>
  )
}

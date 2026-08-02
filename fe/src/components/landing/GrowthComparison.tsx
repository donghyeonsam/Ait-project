import { Sparkles } from 'lucide-react'
import ComparisonSlider from '@/components/comparison-slider'
import SimpleGraph from '@/components/simple-graph'
import { LANDING_ASSET_ROOT } from '@/components/landing/landing.data'
import { ScrollReveal } from '@/components/reactbits/ScrollReveal'

const scoreTrend = [
  { value: 58, label: '1회' },
  { value: 64, label: '2회' },
  { value: 71, label: '3회' },
  { value: 78, label: '4회' },
  { value: 89, label: '5회' },
]

// 반복 연습에 따른 리포트 변화를 비교 슬라이더와 점수 추이 그래프로 보여준다.
// TODO: 비교 이미지는 구성 예시로, 실제 리포트 스크린샷이 준비되면 같은 파일명으로 교체한다.
export function GrowthComparison() {
  return (
    <section
      className="landing-section landing-growth"
      aria-labelledby="growth-title"
    >
      <div className="landing-shell">
        <div className="landing-section-heading">
          <p>
            <Sparkles aria-hidden="true" />
            연습이 만든 변화
          </p>
          <h2 id="growth-title">
            <ScrollReveal text="1회차와 5회차, 직접 비교해보세요" />
          </h2>
          <span>슬라이더를 움직여 리포트가 어떻게 달라지는지 확인해보세요.</span>
        </div>

        <div className="landing-growth__grid">
          <div className="landing-growth__slider">
            <ComparisonSlider
              beforeImage={`${LANDING_ASSET_ROOT}/screens/report-before.png`}
              afterImage={`${LANDING_ASSET_ROOT}/screens/report-after.png`}
              beforeAlt="첫 번째 연습 리포트 구성 예시"
              afterAlt="다섯 번째 연습 리포트 구성 예시"
              ariaLabel="1회차와 5회차 리포트 비교 슬라이더"
              initialPosition={58}
              showLabels
              labelText={{ before: '1회차', after: '5회차' }}
              dividerColor="#c9a96e"
              handleColor="#ffffff"
            />
          </div>

          <div className="landing-growth__trend">
            <strong>종합 점수 추이</strong>
            <SimpleGraph
              data={scoreTrend}
              lineColor="#c9a96e"
              dotColor="#1a2a4a"
              height={210}
              curved
              showGrid
              gridLines="horizontal"
            />
            <small>
              연습을 반복할수록 관찰 지표가 또렷해집니다. 체험 예시
              데이터입니다.
            </small>
          </div>
        </div>
      </div>
    </section>
  )
}

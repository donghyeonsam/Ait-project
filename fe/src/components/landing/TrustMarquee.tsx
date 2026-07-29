import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  LANDING_ASSET_ROOT,
  trustFields,
} from '@/components/landing/landing.data'

function TrustItems({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="landing-trust__items" aria-hidden={hidden || undefined}>
      {trustFields.map((field) => (
        <span className="landing-trust__item" key={`${hidden}-${field}`}>
          <img
            src={`${LANDING_ASSET_ROOT}/visuals/partner-logo-slot.svg`}
            alt=""
            aria-hidden="true"
          />
          <strong>{field}</strong>
        </span>
      ))}
    </div>
  )
}

// 실제 제휴사로 오해되지 않는 직무·기업 유형을 느린 마키로 보여준다.
export function TrustMarquee() {
  return (
    <section className="landing-trust" aria-labelledby="landing-trust-title">
      <div className="landing-shell landing-trust__layout">
        <h2 id="landing-trust-title">
          실전처럼 연습하고
          <br />
          데이터로 성장하세요
        </h2>
        <ChevronLeft className="landing-trust__arrow" aria-hidden="true" />
        <div className="landing-trust__viewport">
          <div className="landing-trust__track">
            <TrustItems />
            <TrustItems hidden />
          </div>
        </div>
        <ChevronRight className="landing-trust__arrow" aria-hidden="true" />
      </div>
    </section>
  )
}

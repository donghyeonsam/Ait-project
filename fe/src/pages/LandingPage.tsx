import { FeatureGrid } from '@/components/landing/FeatureGrid'
import { FinalCta } from '@/components/landing/FinalCta'
import { GrowthProcess } from '@/components/landing/GrowthProcess'
import { HeroSection } from '@/components/landing/HeroSection'
import { InteractiveDemo } from '@/components/landing/InteractiveDemo'
import { TrustMarquee } from '@/components/landing/TrustMarquee'
import { Footer } from '@/components/layout/Footer'
import { LandingHeader } from '@/components/layout/LandingHeader'
import '@/components/landing/landing.css'

// 비로그인 방문자에게 Ait의 면접 연습 경험과 가입 진입점을 소개한다.
export function LandingPage() {
  return (
    <div className="landing-page">
      <LandingHeader />
      <main id="main-content" aria-label="Ait 랜딩 페이지">
        <HeroSection />
        <TrustMarquee />
        <FeatureGrid />
        <InteractiveDemo />
        <GrowthProcess />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

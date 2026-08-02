import { FeatureGrid } from '@/components/landing/FeatureGrid'
import { FinalCta } from '@/components/landing/FinalCta'
import { HeroSection } from '@/components/landing/HeroSection'
import { QuestionShowcase } from '@/components/landing/QuestionShowcase'
import { ScreenGallery } from '@/components/landing/ScreenGallery'
import { TrustMarquee } from '@/components/landing/TrustMarquee'
import { LandingPreloader } from '@/components/landing/LandingPreloader'
import { MultimodalAnalysisSection } from '@/components/landing/multimodal/MultimodalAnalysisSection'
import { Footer } from '@/components/layout/Footer'
import { LandingHeader } from '@/components/layout/LandingHeader'

// 비로그인 방문자에게 Ait의 면접 연습 경험과 가입 진입점을 소개한다.
export function LandingPage() {
  return (
    <div className="landing-page">
      <LandingPreloader />
      <LandingHeader />
      <main id="main-content" aria-label="Ait 랜딩 페이지">
        <HeroSection />
        <TrustMarquee />
        <FeatureGrid />
        <MultimodalAnalysisSection />
        <ScreenGallery />
        <QuestionShowcase />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

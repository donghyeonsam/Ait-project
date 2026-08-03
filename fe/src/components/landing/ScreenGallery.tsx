import { useReducedMotion } from 'framer-motion'
import AuroraBlur from '@/components/aurora-blur'
import ParallaxCarousel from '@/components/parallax-carousel'
import { galleryScreens } from '@/components/landing/landing.data'
import { ScrollReveal } from '@/components/reactbits/ScrollReveal'

// 브랜드 톤으로 눌러둔 오로라 레이어. 네이비 하늘에 골드·블루가 은은하게 흐른다.
const auroraLayers = [
  { color: '#c9a96e', speed: 0.16, intensity: 0.38 },
  { color: '#5a7fc0', speed: 0.1, intensity: 0.28 },
  { color: '#7fd8c9', speed: 0.06, intensity: 0.1 },
]

const auroraSky = [
  { color: '#1a2a4a', blend: 1 },
  { color: '#1a2a4a', blend: 1 },
]

// 서비스 주요 화면 구성을 ReactBits Pro ParallaxCarousel로 미리 보여준다.
// TODO: screens/ 이미지는 구성 예시로, 실제 서비스 스크린샷이 준비되면 같은 파일명으로 교체한다.
export function ScreenGallery() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      className="landing-section landing-gallery"
      id="gallery"
      aria-labelledby="gallery-title"
    >
      {!reduceMotion && (
        <div className="landing-gallery__aurora" aria-hidden="true">
          <AuroraBlur
            width="100%"
            height="100%"
            layers={auroraLayers}
            skyLayers={auroraSky}
            speed={0.5}
            opacity={0.45}
            verticalFade={1.2}
            brightness={0.8}
            saturation={0.9}
          />
        </div>
      )}
      <div className="landing-shell">
        <div className="landing-section-heading">
          <h2 id="gallery-title">
            <ScrollReveal text="Ait의 화면을 미리 둘러보세요" />
          </h2>
          <span>드래그하거나 스크롤하며 주요 화면 구성을 살펴볼 수 있습니다.</span>
        </div>

        <div
          className="landing-gallery__carousel"
          role="img"
          aria-label={`서비스 화면 구성 예시: ${galleryScreens
            .map((screen) => screen.label)
            .join(', ')}`}
        >
          <ParallaxCarousel
            images={galleryScreens.map((screen) => screen.src)}
            imageWidth={540}
            imageHeight={340}
            gap={28}
            parallaxIntensity={0.35}
            uvScale={0.1}
            borderRadius={16}
            loop
            autoplaySpeed={36}
            pauseOnHover
          />
        </div>
        <p className="landing-gallery__hint">
          실제 서비스 화면을 단순화한 구성 예시입니다.
        </p>
      </div>
    </section>
  )
}

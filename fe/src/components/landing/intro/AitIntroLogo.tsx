import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import {
  clipRect,
  INTRO_TIMELINE as timeline,
  LENS,
  lensHoleMask,
  LOGO_BOX,
  LOGO_PARTS,
  LOGO_SRC,
  originAt,
  shiftX,
  shiftY,
  SPARK_TRACK_SCALE,
  SYMBOL_CENTER,
  SYMBOL_SOLO_SCALE,
  SYMBOL_SOLO_SHIFT,
  TIE_PIVOT,
  TRAVEL_PATHS,
  type LogoRect,
} from '@/components/landing/intro/ait-intro-logo.geometry'

// 디자인 토큰 easing을 framer-motion 배열 형태로 옮긴 값이다.
const EASE_STANDARD = [0.4, 0, 0.2, 1] as const
const EASE_EMPHASIZED = [0.2, 0, 0, 1] as const
const EASE_BACK_OUT = [0.34, 1.56, 0.64, 1] as const

// 네이비 링을 stroke 원 하나로 되짚어 그리기 위한 값이다.
const RING_RADIUS = (LENS.goldRadius + LENS.outerRadius) / 2
const RING_WIDTH = LENS.outerRadius - LENS.goldRadius

const layerProps = (part: LogoRect) => ({
  src: LOGO_SRC,
  alt: '',
  draggable: false,
  decoding: 'async' as const,
  className: 'ait-intro-logo__layer',
  style: { clipPath: clipRect(part) },
})

// SVG 도형은 자기 도형 상자를 기준으로 확대해야 제자리에서 커진다.
const shapeScaleStyle = { transformBox: 'fill-box', transformOrigin: 'center' } as const

interface AitIntroLogoProps {
  /** 풀로고가 완성되고 짧게 유지된 시점을 알린다. */
  onComplete: () => void
}

// 심볼 원 2개가 렌즈로 합쳐진 뒤 심볼이 왼쪽으로 비켜서고, Ait 글자와 넥타이가 채워지는 진입 연출이다.
export function AitIntroLogo({ onComplete }: AitIntroLogoProps) {
  // 이미지 디코딩이 끝난 뒤 타임라인을 시작해 첫 구간이 빈 화면으로 지나가지 않게 한다.
  const [ready, setReady] = useState(false)
  const [lensRevealed, setLensRevealed] = useState(false)
  // 부모가 다시 렌더링돼도 타임라인 타이머가 다시 시작되지 않게 콜백을 ref로 붙잡는다.
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    let settled = false
    const start = () => {
      if (settled) return
      settled = true
      setReady(true)
    }

    const image = new Image()
    image.onload = start
    image.onerror = start
    image.src = LOGO_SRC
    // 디코딩이 지연되거나 실패해도 연출이 멈추지 않게 한다.
    const fallbackId = window.setTimeout(start, 900)

    return () => window.clearTimeout(fallbackId)
  }, [])

  useEffect(() => {
    if (!ready) return

    // 되짚어 그린 렌즈와 원본 렌즈 픽셀을 같은 프레임에 교체해 이음선이 보이지 않게 한다.
    const swapId = window.setTimeout(
      () => setLensRevealed(true),
      timeline.lensSwap.at * 1000,
    )
    const completeId = window.setTimeout(
      () => onCompleteRef.current(),
      timeline.complete.at * 1000,
    )

    return () => {
      window.clearTimeout(swapId)
      window.clearTimeout(completeId)
    }
  }, [ready])

  if (!ready) {
    return <div className="ait-intro-logo" aria-hidden="true" />
  }

  const symbolLayer = layerProps(LOGO_PARTS.symbol)
  const tieLayer = layerProps(LOGO_PARTS.tie)

  return (
    <div className="ait-intro-logo" aria-hidden="true">
      <motion.div
        className="ait-intro-logo__slide"
        initial={{ x: shiftX(SYMBOL_SOLO_SHIFT) }}
        animate={{ x: shiftX(0) }}
        transition={{
          delay: timeline.symbolSlide.at,
          duration: timeline.symbolSlide.duration,
          ease: EASE_EMPHASIZED,
        }}
      >
        <motion.div
          className="ait-intro-logo__symbol"
          style={{ transformOrigin: originAt(SYMBOL_CENTER) }}
          initial={{ opacity: 0, y: shiftY(20), scale: SYMBOL_SOLO_SCALE }}
          animate={{ opacity: 1, y: shiftY(0), scale: 1 }}
          transition={{
            opacity: {
              delay: timeline.symbolIn.at,
              duration: timeline.symbolIn.duration,
              ease: EASE_STANDARD,
            },
            y: {
              delay: timeline.symbolIn.at,
              duration: timeline.symbolIn.duration,
              ease: EASE_EMPHASIZED,
            },
            scale: {
              delay: timeline.symbolSlide.at,
              duration: timeline.symbolSlide.duration,
              ease: EASE_EMPHASIZED,
            },
          }}
        >
          <img
            {...symbolLayer}
            style={{
              ...symbolLayer.style,
              maskImage: lensHoleMask(),
              WebkitMaskImage: lensHoleMask(),
            }}
          />

          {/* 되짚어 그린 렌즈가 완성되면 덜어냈던 원본 픽셀을 같은 프레임에 끼워 넣는다. */}
          {lensRevealed && <img {...layerProps(LOGO_PARTS.lens)} />}

          <svg
            className="ait-intro-logo__lens"
            viewBox={`0 0 ${LOGO_BOX.width} ${LOGO_BOX.height}`}
            focusable="false"
          >
            {!lensRevealed && (
              <>
                <motion.circle
                  className="ait-intro-logo__lens-ring"
                  cx={LENS.cx}
                  cy={LENS.cy}
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth={RING_WIDTH}
                  style={shapeScaleStyle}
                  initial={{ opacity: 0, scale: 0.32 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: timeline.lensForm.at,
                    duration: timeline.lensForm.duration,
                    ease: EASE_BACK_OUT,
                  }}
                />
                {Object.entries(TRAVEL_PATHS).map(([side, path]) => (
                  <motion.g
                    key={side}
                    initial={{ x: path.x[0], y: path.y[0] }}
                    animate={{ x: path.x, y: path.y }}
                    transition={{
                      delay: timeline.travel.at,
                      duration: timeline.travel.duration,
                      times: path.times,
                      // 가감속은 좌표 간격에 이미 반영돼 있다.
                      ease: 'linear',
                    }}
                  >
                    <motion.circle
                      className="ait-intro-logo__spark"
                      r={LENS.goldRadius}
                      style={shapeScaleStyle}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{
                        opacity: [0, 1, 1, 1, 1],
                        scale: [
                          0.4,
                          SPARK_TRACK_SCALE,
                          SPARK_TRACK_SCALE,
                          1.2,
                          1,
                        ],
                      }}
                      transition={{
                        delay: timeline.travel.at,
                        duration:
                          timeline.lensForm.at +
                          timeline.lensForm.duration -
                          timeline.travel.at,
                        times: [0, 0.12, 0.72, 0.88, 1],
                        ease: EASE_STANDARD,
                      }}
                    />
                  </motion.g>
                ))}
              </>
            )}
          </svg>
        </motion.div>
      </motion.div>

      <div className="ait-intro-logo__wordmark">
        {/* 글자를 한 덩어리로 페이드인한다. 넥타이 가림 조각도 같이 묶어야 배경 위에 먼저 드러나지 않는다. */}
        <motion.div
          className="ait-intro-logo__letters"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: timeline.letters.at,
            duration: timeline.letters.duration,
            ease: EASE_STANDARD,
          }}
        >
          <img {...layerProps(LOGO_PARTS.letterA)} />
          <img {...layerProps(LOGO_PARTS.letterIHead)} />
          <img {...layerProps(LOGO_PARTS.letterIBody)} />
          {/* 원본 넥타이를 몸통과 같은 네이비로 가려 두고 매는 연출로 다시 채운다. */}
          <div
            className="ait-intro-logo__tie-cover"
            style={{ clipPath: clipRect(LOGO_PARTS.tie) }}
          />
          <img {...layerProps(LOGO_PARTS.letterT)} />
        </motion.div>
        <motion.img
          {...tieLayer}
          style={{ ...tieLayer.style, transformOrigin: originAt(TIE_PIVOT) }}
          initial={{ opacity: 0, scaleX: 0.72, scaleY: 0, rotate: -5 }}
          animate={{
            opacity: [0, 1, 1],
            scaleX: [0.72, 1, 1],
            scaleY: [0, 1.05, 1],
            rotate: [-5, 2.5, 0],
          }}
          transition={{
            delay: timeline.tie.at,
            duration: timeline.tie.duration,
            times: [0, 0.62, 1],
            ease: [EASE_EMPHASIZED, EASE_STANDARD],
          }}
        />
      </div>
    </div>
  )
}

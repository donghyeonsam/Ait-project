import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

const vertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  precision highp float;

  uniform float uTime, uAttenuation, uLineThickness;
  uniform float uBaseRadius, uRadiusStep, uScaleRate;
  uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;
  uniform float uFadeIn, uFadeOut;
  uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
  uniform vec2 uResolution, uMouse;
  uniform vec3 uColor, uColorTwo;
  uniform int uRingCount;

  const float HALF_PI = 1.5707963;
  const float CYCLE = 3.45;

  float fade(float time) {
    return time < uFadeIn
      ? smoothstep(0.0, uFadeIn, time)
      : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, time);
  }

  float ring(vec2 point, float radius, float cut, float timeOffset, float pixel) {
    float time = mod(uTime + timeOffset, CYCLE);
    float animatedRadius = radius + time / CYCLE * uScaleRate;
    float distanceFromRing = abs(length(point) - animatedRadius);
    float angle = atan(abs(point.y), abs(point.x)) / HALF_PI;
    float thickness = max(1.0 - angle, 0.5) * pixel * uLineThickness;
    float highlight = (1.0 - smoothstep(thickness, thickness * 1.5, distanceFromRing)) + 1.0;

    distanceFromRing += pow(cut * angle, 3.0) * animatedRadius;
    return highlight * exp(-uAttenuation * distanceFromRing) * fade(time);
  }

  void main() {
    float pixel = 1.0 / min(uResolution.x, uResolution.y);
    vec2 point = (gl_FragCoord.xy - 0.5 * uResolution.xy) * pixel;
    float cosine = cos(uRotation);
    float sine = sin(uRotation);

    point = mat2(cosine, -sine, sine, cosine) * point;
    point -= uMouse * uMouseInfluence;

    float scale = mix(1.0, uHoverScale, uHoverAmount) + uBurst * 0.3;
    point /= scale;

    vec3 finalColor = vec3(0.0);
    float ringCountFactor = max(float(uRingCount) - 1.0, 1.0);

    for (int index = 0; index < 10; index++) {
      if (index >= uRingCount) break;

      float ringIndex = float(index);
      vec2 ringPoint = point - ringIndex * uParallax * uMouse;
      vec3 ringColor = mix(uColor, uColorTwo, ringIndex / ringCountFactor);
      float ringValue = ring(
        ringPoint,
        uBaseRadius + ringIndex * uRadiusStep,
        pow(uRingGap, ringIndex),
        index == 0 ? 0.0 : 2.95 * ringIndex,
        pixel
      );

      finalColor = mix(finalColor, ringColor, vec3(ringValue));
    }

    finalColor *= 1.0 + uBurst * 2.0;
    float noise = fract(
      sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453
    );
    finalColor += (noise - 0.5) * uNoiseAmount;

    gl_FragColor = vec4(
      finalColor,
      max(finalColor.r, max(finalColor.g, finalColor.b)) * uOpacity
    );
  }
`

interface MagicRingsProps {
  className?: string
  color?: string
  colorTwo?: string
  speed?: number
  ringCount?: number
  attenuation?: number
  lineThickness?: number
  baseRadius?: number
  radiusStep?: number
  scaleRate?: number
  opacity?: number
  blur?: number
  noiseAmount?: number
  rotation?: number
  ringGap?: number
  fadeIn?: number
  fadeOut?: number
  followMouse?: boolean
  mouseInfluence?: number
  hoverScale?: number
  parallax?: number
  clickBurst?: boolean
}

// ReactBits Magic Rings 셰이더에 동작 줄이기와 렌더러 정리를 보완해 제공한다.
export function MagicRings({
  className,
  color = '#FC42FF',
  colorTwo = '#42FCFF',
  speed = 1,
  ringCount = 6,
  attenuation = 10,
  lineThickness = 2,
  baseRadius = 0.35,
  radiusStep = 0.1,
  scaleRate = 0.1,
  opacity = 1,
  blur = 0,
  noiseAmount = 0.1,
  rotation = 0,
  ringGap = 1.5,
  fadeIn = 0.7,
  fadeOut = 0.5,
  followMouse = false,
  mouseInfluence = 0.2,
  hoverScale = 1.2,
  parallax = 0.05,
  clickBurst = false,
}: MagicRingsProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef([0, 0])
  const smoothMouseRef = useRef([0, 0])
  const hoverAmountRef = useRef(0)
  const isHoveredRef = useRef(false)
  const burstRef = useRef(0)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
    } catch {
      return
    }

    if (!renderer.capabilities.isWebGL2) {
      renderer.dispose()
      return
    }

    renderer.setClearColor(0x000000, 0)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.1,
      10,
    )
    camera.position.z = 1

    const uniforms = {
      uTime: { value: 0 },
      uAttenuation: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Color() },
      uColorTwo: { value: new THREE.Color() },
      uLineThickness: { value: 0 },
      uBaseRadius: { value: 0 },
      uRadiusStep: { value: 0 },
      uScaleRate: { value: 0 },
      uRingCount: { value: 0 },
      uOpacity: { value: 1 },
      uNoiseAmount: { value: 0 },
      uRotation: { value: 0 },
      uRingGap: { value: 1.6 },
      uFadeIn: { value: 0.5 },
      uFadeOut: { value: 0.75 },
      uMouse: { value: new THREE.Vector2() },
      uMouseInfluence: { value: 0 },
      uHoverAmount: { value: 0 },
      uHoverScale: { value: 1 },
      uParallax: { value: 0 },
      uBurst: { value: 0 },
    }
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
    })
    const geometry = new THREE.PlaneGeometry(1, 1)
    const quad = new THREE.Mesh(geometry, material)
    scene.add(quad)

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      const pixelRatio = Math.min(window.devicePixelRatio, 2)
      if (width === 0 || height === 0) return

      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height)
      uniforms.uResolution.value.set(
        width * pixelRatio,
        height * pixelRatio,
      )
    }

    const onMouseMove = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect()
      mouseRef.current[0] = (event.clientX - rect.left) / rect.width - 0.5
      mouseRef.current[1] = -(
        (event.clientY - rect.top) / rect.height -
        0.5
      )
    }
    const onMouseEnter = () => {
      isHoveredRef.current = true
    }
    const onMouseLeave = () => {
      isHoveredRef.current = false
      mouseRef.current = [0, 0]
    }
    const onClick = () => {
      burstRef.current = 1
    }

    resize()
    window.addEventListener('resize', resize)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    mount.addEventListener('mousemove', onMouseMove)
    mount.addEventListener('mouseenter', onMouseEnter)
    mount.addEventListener('mouseleave', onMouseLeave)
    mount.addEventListener('click', onClick)

    let frameId: number | undefined
    const renderFrame = (time: number) => {
      smoothMouseRef.current[0] +=
        (mouseRef.current[0] - smoothMouseRef.current[0]) * 0.08
      smoothMouseRef.current[1] +=
        (mouseRef.current[1] - smoothMouseRef.current[1]) * 0.08
      hoverAmountRef.current +=
        ((isHoveredRef.current ? 1 : 0) - hoverAmountRef.current) * 0.08
      burstRef.current *= 0.95
      if (burstRef.current < 0.001) burstRef.current = 0

      uniforms.uTime.value = time * 0.001 * speed
      uniforms.uAttenuation.value = attenuation
      uniforms.uColor.value.set(color)
      uniforms.uColorTwo.value.set(colorTwo)
      uniforms.uLineThickness.value = lineThickness
      uniforms.uBaseRadius.value = baseRadius
      uniforms.uRadiusStep.value = radiusStep
      uniforms.uScaleRate.value = scaleRate
      uniforms.uRingCount.value = Math.min(Math.max(ringCount, 1), 10)
      uniforms.uOpacity.value = opacity
      uniforms.uNoiseAmount.value = noiseAmount
      uniforms.uRotation.value = (rotation * Math.PI) / 180
      uniforms.uRingGap.value = ringGap
      uniforms.uFadeIn.value = fadeIn
      uniforms.uFadeOut.value = fadeOut
      uniforms.uMouse.value.set(
        smoothMouseRef.current[0],
        smoothMouseRef.current[1],
      )
      uniforms.uMouseInfluence.value = followMouse ? mouseInfluence : 0
      uniforms.uHoverAmount.value = hoverAmountRef.current
      uniforms.uHoverScale.value = hoverScale
      uniforms.uParallax.value = parallax
      uniforms.uBurst.value = clickBurst ? burstRef.current : 0
      renderer.render(scene, camera)
    }
    const animate = (time: number) => {
      renderFrame(time)
      frameId = window.requestAnimationFrame(animate)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      renderFrame(900)
    } else {
      frameId = window.requestAnimationFrame(animate)
    }

    return () => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      resizeObserver.disconnect()
      mount.removeEventListener('mousemove', onMouseMove)
      mount.removeEventListener('mouseenter', onMouseEnter)
      mount.removeEventListener('mouseleave', onMouseLeave)
      mount.removeEventListener('click', onClick)
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [
    attenuation,
    baseRadius,
    clickBurst,
    color,
    colorTwo,
    fadeIn,
    fadeOut,
    followMouse,
    hoverScale,
    lineThickness,
    mouseInfluence,
    noiseAmount,
    opacity,
    parallax,
    radiusStep,
    ringCount,
    ringGap,
    rotation,
    scaleRate,
    speed,
  ])

  return (
    <div
      ref={mountRef}
      className={cn('magic-rings size-full', className)}
      style={blur > 0 ? { filter: `blur(${blur}px)` } : undefined}
      aria-hidden="true"
    />
  )
}

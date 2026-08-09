import { useCallback, useEffect, useRef, useState } from 'react'
import { selectListeningVideo } from '@/components/interview/interviewer-videos'

const CROSSFADE_SECONDS = 0.24
const CROSSFADE_CLEANUP_MS = 280

interface VideoLayer {
  id: number
  src: string
}

interface InterviewerVideoProps {
  posterSrc: string
  /** 질문이 바뀌면 경청 영상을 처음부터 다시 순환시키기 위한 구분값이다. */
  phaseKey: string
  isListeningPlaybackActive: boolean
}

// 질문 중에는 포스터를 유지하고, 답변 경청 중에는 동작 영상을 순환한다.
export function InterviewerVideo({
  posterSrc,
  phaseKey,
  isListeningPlaybackActive,
}: InterviewerVideoProps) {
  const [layers, setLayers] = useState<VideoLayer[]>([])
  const [activeLayerId, setActiveLayerId] = useState<number | null>(null)
  const activeLayerIdRef = useRef<number | null>(null)
  const desiredLayerIdRef = useRef<number | null>(null)
  const layerIdRef = useRef(0)
  const phaseRef = useRef('')
  const cleanupTimerRef = useRef<number | null>(null)

  const clearCleanupTimer = useCallback(() => {
    if (cleanupTimerRef.current === null) return
    window.clearTimeout(cleanupTimerRef.current)
    cleanupTimerRef.current = null
  }, [])

  const transitionToVideo = useCallback(
    (src: string) => {
      clearCleanupTimer()
      const nextLayer: VideoLayer = { id: ++layerIdRef.current, src }
      desiredLayerIdRef.current = nextLayer.id
      setLayers((current) => {
        const activeLayer = current.find(
          (layer) => layer.id === activeLayerIdRef.current,
        )
        return activeLayer ? [activeLayer, nextLayer] : [nextLayer]
      })
    },
    [clearCleanupTimer],
  )

  const transitionToPoster = useCallback(() => {
    clearCleanupTimer()
    desiredLayerIdRef.current = null
    activeLayerIdRef.current = null
    setActiveLayerId(null)
    cleanupTimerRef.current = window.setTimeout(() => {
      setLayers([])
      cleanupTimerRef.current = null
    }, CROSSFADE_CLEANUP_MS)
  }, [clearCleanupTimer])

  const playNextListeningVideo = useCallback(() => {
    const selection = selectListeningVideo(Math.random)
    transitionToVideo(selection.src)
  }, [transitionToVideo])

  useEffect(() => {
    const phase = isListeningPlaybackActive
      ? `listening:${phaseKey}`
      : `idle:${phaseKey}`
    if (phaseRef.current === phase) return
    const transitionTimer = window.setTimeout(() => {
      phaseRef.current = phase

      if (isListeningPlaybackActive) {
        playNextListeningVideo()
        return
      }

      transitionToPoster()
    }, 0)

    return () => window.clearTimeout(transitionTimer)
  }, [
    isListeningPlaybackActive,
    phaseKey,
    playNextListeningVideo,
    transitionToPoster,
  ])

  useEffect(
    () => () => {
      clearCleanupTimer()
    },
    [clearCleanupTimer],
  )

  const handlePlaying = (layer: VideoLayer) => {
    if (desiredLayerIdRef.current !== layer.id) return

    clearCleanupTimer()
    activeLayerIdRef.current = layer.id
    setActiveLayerId(layer.id)
    cleanupTimerRef.current = window.setTimeout(() => {
      setLayers((current) =>
        current.filter((currentLayer) => currentLayer.id === layer.id),
      )
      cleanupTimerRef.current = null
    }, CROSSFADE_CLEANUP_MS)
  }

  const handleCanPlay = (layer: VideoLayer, video: HTMLVideoElement) => {
    if (layer.id !== desiredLayerIdRef.current || !video.paused) return
    void video.play()?.catch(() => {})
  }

  // 다음 영상을 남은 크로스페이드 시간만큼 미리 띄워 전환 순간의 끊김을 없앤다.
  const handleListeningProgress = (
    layer: VideoLayer,
    video: HTMLVideoElement,
  ) => {
    if (
      layer.id !== activeLayerIdRef.current ||
      layer.id !== desiredLayerIdRef.current ||
      !Number.isFinite(video.duration) ||
      video.duration - video.currentTime > CROSSFADE_SECONDS
    ) {
      return
    }

    playNextListeningVideo()
  }

  const handleEnded = (layer: VideoLayer) => {
    if (
      layer.id !== desiredLayerIdRef.current ||
      layer.id !== activeLayerIdRef.current
    ) {
      return
    }
    playNextListeningVideo()
  }

  const handleError = (layer: VideoLayer) => {
    if (layer.id !== desiredLayerIdRef.current) return
    playNextListeningVideo()
  }

  return (
    <div className="interviewer-media">
      <img
        src={posterSrc}
        alt="AI 면접관"
        className="interviewer-media-poster"
      />
      {layers.map((layer) => (
        <video
          key={layer.id}
          src={layer.src}
          className={`interviewer-media-video${
            layer.id === activeLayerId ? ' is-active' : ''
          }`}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onCanPlay={(event) => handleCanPlay(layer, event.currentTarget)}
          onPlaying={() => handlePlaying(layer)}
          onTimeUpdate={(event) =>
            handleListeningProgress(layer, event.currentTarget)
          }
          onEnded={() => handleEnded(layer)}
          onError={() => handleError(layer)}
        />
      ))}
    </div>
  )
}

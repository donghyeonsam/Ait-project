import { useCallback, useEffect, useRef, useState } from 'react'
import { selectListeningVideo } from '@/components/interview/demo-interviewer-videos'

const CROSSFADE_SECONDS = 0.24
const CROSSFADE_CLEANUP_MS = 280

type VideoLayerKind = 'question' | 'listening'

interface VideoLayer {
  id: number
  kind: VideoLayerKind
  src: string
  playbackKey: string | null
}

interface DemoInterviewerVideoProps {
  posterSrc: string
  questionKey: string
  questionVideoSrc: string | null
  isQuestionPlaybackActive: boolean
  isListeningPlaybackActive: boolean
  speakerMuted: boolean
  speakerVolume: number
  onQuestionPlaying: (playbackKey: string) => void
  onQuestionEnded: (playbackKey: string) => void
  onQuestionPlaybackError: (
    playbackKey: string,
    reason: 'blocked' | 'unavailable',
  ) => void
}

// 질문 중에는 포스터를 유지하고, 답변 경청 중에는 동작 영상을 순환한다.
export function DemoInterviewerVideo({
  posterSrc,
  questionKey,
  questionVideoSrc,
  isQuestionPlaybackActive,
  isListeningPlaybackActive,
  speakerMuted,
  speakerVolume,
  onQuestionPlaying,
  onQuestionEnded,
  onQuestionPlaybackError,
}: DemoInterviewerVideoProps) {
  const [layers, setLayers] = useState<VideoLayer[]>([])
  const [activeLayerId, setActiveLayerId] = useState<number | null>(null)
  const activeLayerIdRef = useRef<number | null>(null)
  const desiredLayerIdRef = useRef<number | null>(null)
  const layerIdRef = useRef(0)
  const phaseRef = useRef('')
  const cleanupTimerRef = useRef<number | null>(null)
  const videoElementsRef = useRef<Map<number, HTMLVideoElement>>(new Map())
  const blockedLayerIdRef = useRef<number | null>(null)

  const clearCleanupTimer = useCallback(() => {
    if (cleanupTimerRef.current === null) return
    window.clearTimeout(cleanupTimerRef.current)
    cleanupTimerRef.current = null
  }, [])

  const transitionToVideo = useCallback(
    (
      src: string,
      kind: VideoLayerKind,
      playbackKey: string | null = null,
    ) => {
      clearCleanupTimer()
      const nextLayer: VideoLayer = {
        id: ++layerIdRef.current,
        kind,
        src,
        playbackKey,
      }
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
    transitionToVideo(selection.src, 'listening')
  }, [transitionToVideo])

  useEffect(() => {
    const phase = isQuestionPlaybackActive
      ? `question:${questionKey}:${questionVideoSrc ?? 'poster'}`
      : isListeningPlaybackActive
        ? `listening:${questionKey}`
        : `idle:${questionKey}`
    if (phaseRef.current === phase) return
    const transitionTimer = window.setTimeout(() => {
      phaseRef.current = phase

      if (isListeningPlaybackActive && !isQuestionPlaybackActive) {
        playNextListeningVideo()
        return
      }

      if (!isQuestionPlaybackActive) {
        transitionToPoster()
        return
      }

      if (questionVideoSrc) {
        transitionToVideo(questionVideoSrc, 'question', questionKey)
        return
      }

      transitionToPoster()
    }, 0)

    return () => window.clearTimeout(transitionTimer)
  }, [
    isListeningPlaybackActive,
    isQuestionPlaybackActive,
    playNextListeningVideo,
    questionKey,
    questionVideoSrc,
    transitionToPoster,
    transitionToVideo,
  ])

  useEffect(() => {
    const volume = Math.min(1, Math.max(0, speakerVolume / 100))
    videoElementsRef.current.forEach((video, layerId) => {
      const layer = layers.find((item) => item.id === layerId)
      video.muted = layer?.kind !== 'question' || speakerMuted
      video.volume = volume
    })
  }, [layers, speakerMuted, speakerVolume])

  useEffect(
    () => () => {
      clearCleanupTimer()
    },
    [clearCleanupTimer],
  )

  const handlePlaying = (layer: VideoLayer) => {
    if (desiredLayerIdRef.current !== layer.id) return

    clearCleanupTimer()
    blockedLayerIdRef.current = null
    const nextActiveLayerId = layer.kind === 'listening' ? layer.id : null
    activeLayerIdRef.current = nextActiveLayerId
    setActiveLayerId(nextActiveLayerId)
    if (layer.kind === 'question' && layer.playbackKey) {
      onQuestionPlaying(layer.playbackKey)
    }
    cleanupTimerRef.current = window.setTimeout(() => {
      setLayers((current) =>
        current.filter((currentLayer) => currentLayer.id === layer.id),
      )
      cleanupTimerRef.current = null
    }, CROSSFADE_CLEANUP_MS)
  }

  const handleCanPlay = (layer: VideoLayer, video: HTMLVideoElement) => {
    if (layer.id !== desiredLayerIdRef.current || !video.paused) return

    const playRequest = video.play()
    if (!playRequest) return
    void playRequest.catch(() => {
      if (
        layer.kind !== 'question' ||
        !layer.playbackKey ||
        layer.id !== desiredLayerIdRef.current ||
        blockedLayerIdRef.current === layer.id
      ) {
        return
      }
      blockedLayerIdRef.current = layer.id
      onQuestionPlaybackError(layer.playbackKey, 'blocked')
    })
  }

  const handleListeningProgress = (
    layer: VideoLayer,
    video: HTMLVideoElement,
  ) => {
    if (
      layer.kind !== 'listening' ||
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
    if (layer.id !== desiredLayerIdRef.current) return

    if (layer.kind === 'question' && layer.playbackKey) {
      onQuestionEnded(layer.playbackKey)
      return
    }

    if (
      layer.kind === 'listening' &&
      layer.id === activeLayerIdRef.current
    ) {
      playNextListeningVideo()
    }
  }

  const handleError = (layer: VideoLayer) => {
    if (layer.id !== desiredLayerIdRef.current) return
    if (layer.kind === 'listening') {
      playNextListeningVideo()
      return
    }
    if (layer.playbackKey) {
      onQuestionPlaybackError(layer.playbackKey, 'unavailable')
    }
    transitionToPoster()
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
          ref={(video) => {
            if (!video) {
              videoElementsRef.current.delete(layer.id)
              return
            }
            videoElementsRef.current.set(layer.id, video)
            video.muted = layer.kind !== 'question' || speakerMuted
            video.volume = Math.min(1, Math.max(0, speakerVolume / 100))
          }}
          src={layer.src}
          className={`interviewer-media-video${
            layer.id === activeLayerId ? ' is-active' : ''
          }`}
          autoPlay
          muted={layer.kind !== 'question' || speakerMuted}
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

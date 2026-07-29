import { useCallback, useEffect, useRef, useState } from 'react'
import { synthesizeQuestionSpeech, ttsResponseToBlob } from '@/api/speech'

interface UseQuestionSpeechOptions {
  text: string
  volume: number
  muted: boolean
  enabled: boolean
}

// BE TTS 모델(gpt-4o-mini-tts)이 speed 파라미터를 지원하지 않아 재생 측에서 배속을 준다.
const SPEECH_RATE = 1.2

function clampVolume(volume: number) {
  return Math.min(1, Math.max(0, volume / 100))
}

// 질문 텍스트를 서버 TTS mp3로 재생하고, 실패 시 브라우저 음성 합성으로 폴백한다.
export function useQuestionSpeech({
  text,
  volume,
  muted,
  enabled,
}: UseQuestionSpeechOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textRef = useRef(text)
  const volumeRef = useRef(volume)
  const mutedRef = useRef(muted)
  const enabledRef = useRef(enabled)
  const generationRef = useRef(0)
  const cacheRef = useRef<Map<string, string>>(new Map())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    textRef.current = text
    volumeRef.current = volume
    mutedRef.current = muted
    enabledRef.current = enabled
  }, [enabled, muted, text, volume])

  const invalidateSpeech = useCallback(() => {
    generationRef.current += 1
    audioRef.current?.pause()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])

  const cancel = useCallback(() => {
    invalidateSpeech()
    setIsSpeaking(false)
  }, [invalidateSpeech])

  const speakWithSynthesis = useCallback((generation: number) => {
    if (
      typeof window === 'undefined' ||
      !window.speechSynthesis ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      setError('질문 음성을 재생하지 못했습니다. 화면의 질문을 확인해주세요.')
      return
    }

    const utterance = new SpeechSynthesisUtterance(textRef.current)
    utterance.lang = 'ko-KR'
    utterance.rate = SPEECH_RATE
    utterance.volume = clampVolume(volumeRef.current)
    utterance.onstart = () => {
      if (generationRef.current === generation) setIsSpeaking(true)
    }
    utterance.onend = () => {
      if (generationRef.current === generation) setIsSpeaking(false)
    }
    utterance.onerror = () => {
      if (generationRef.current !== generation) return
      setIsSpeaking(false)
      setError('질문 음성을 재생하지 못했습니다. 질문 다시 듣기를 눌러 재시도해주세요.')
    }
    window.speechSynthesis.speak(utterance)
  }, [])

  const playFromUrl = useCallback(
    async (url: string, generation: number) => {
      audioRef.current?.pause()
      const audio = new Audio()
      audio.src = url
      audio.volume = clampVolume(volumeRef.current)
      // src 재설정 시 playbackRate가 defaultPlaybackRate로 되돌아가므로 둘 다 지정한다.
      audio.defaultPlaybackRate = SPEECH_RATE
      audio.playbackRate = SPEECH_RATE
      // 배속에도 음높이를 유지해 남성 음성(onyx)이 부자연스러워지지 않게 한다.
      audio.preservesPitch = true
      audio.onplay = () => {
        if (generationRef.current === generation) setIsSpeaking(true)
      }
      audio.onended = () => {
        if (generationRef.current === generation) setIsSpeaking(false)
      }
      audio.onpause = () => {
        if (generationRef.current === generation) setIsSpeaking(false)
      }
      audioRef.current = audio

      try {
        await audio.play()
      } catch (playError) {
        if (generationRef.current !== generation) return
        if (
          playError instanceof DOMException &&
          playError.name === 'NotAllowedError'
        ) {
          // 브라우저 autoplay 정책 차단 — replay 클릭은 user gesture라 성공하므로 안내만 한다.
          setError('질문 다시 듣기를 눌러 질문을 들어주세요.')
          return
        }
        speakWithSynthesis(generation)
      }
    },
    [speakWithSynthesis],
  )

  const speak = useCallback(() => {
    cancel()
    setError(null)
    if (mutedRef.current || !enabledRef.current) return

    const generation = generationRef.current
    const questionText = textRef.current
    const cachedUrl = cacheRef.current.get(questionText)
    if (cachedUrl) {
      void playFromUrl(cachedUrl, generation)
      return
    }

    void (async () => {
      try {
        const response = await synthesizeQuestionSpeech(questionText)
        const url = URL.createObjectURL(ttsResponseToBlob(response))
        // 응답 대기 중 질문이 넘어갔어도 캐시에는 남겨 다음 히트에 재사용한다.
        cacheRef.current.set(questionText, url)
        if (generationRef.current !== generation) return
        await playFromUrl(url, generation)
      } catch {
        if (generationRef.current !== generation) return
        speakWithSynthesis(generation)
      }
    })()
  }, [cancel, playFromUrl, speakWithSynthesis])

  useEffect(() => {
    const timer = window.setTimeout(speak, 0)
    return () => {
      window.clearTimeout(timer)
      invalidateSpeech()
    }
  }, [enabled, invalidateSpeech, speak, text])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = clampVolume(volume)
  }, [volume])

  useEffect(() => {
    if (!muted) return

    invalidateSpeech()
    const timer = window.setTimeout(() => setIsSpeaking(false), 0)
    return () => window.clearTimeout(timer)
  }, [invalidateSpeech, muted])

  useEffect(() => {
    const cache = cacheRef.current
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
      cache.forEach((url) => URL.revokeObjectURL(url))
      cache.clear()
    }
  }, [])

  return { isSpeaking, error, replay: speak }
}

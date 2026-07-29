import { useCallback, useEffect, useRef, useState } from 'react'
// TODO: Whisper는 STT 전용이라 서버 TTS 도입이 확정되면 import를 복원한다.
// import { synthesizeQuestionSpeech, ttsResponseToBlob } from '@/api/speech'

interface UseQuestionSpeechOptions {
  text: string
  volume: number
  muted: boolean
  enabled: boolean
}

function clampVolume(volume: number) {
  return Math.min(1, Math.max(0, volume / 100))
}

// 질문 텍스트를 브라우저 음성 합성으로 재생한다. 서버 TTS 도입 시 mp3 재생 경로를 복원한다.
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
    utterance.rate = 1
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

  // TODO: 서버 TTS mp3 재생 경로 — 서버 TTS(예: OpenAI TTS) 도입이 확정되면 복원한다.
  /*
  const playFromUrl = useCallback(
    async (url: string, generation: number) => {
      audioRef.current?.pause()
      const audio = new Audio()
      audio.src = url
      audio.volume = clampVolume(volumeRef.current)
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
  */

  const speak = useCallback(() => {
    cancel()
    setError(null)
    if (mutedRef.current || !enabledRef.current) return

    const generation = generationRef.current
    // TODO: 서버 TTS 도입 전까지 브라우저 음성 합성으로만 재생한다 — 도입 확정 시 아래 mp3 경로를 복원한다.
    /*
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
    */
    speakWithSynthesis(generation)
  }, [cancel, speakWithSynthesis])

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

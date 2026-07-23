import { useCallback, useEffect, useRef, useState } from 'react'

interface UseQuestionSpeechOptions {
  text: string
  volume: number
  muted: boolean
  enabled: boolean
}

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

  useEffect(() => {
    textRef.current = text
    volumeRef.current = volume
    mutedRef.current = muted
    enabledRef.current = enabled
  }, [enabled, muted, text, volume])

  const invalidateSpeech = useCallback(() => {
    generationRef.current += 1
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])

  const cancel = useCallback(() => {
    invalidateSpeech()
    setIsSpeaking(false)
  }, [invalidateSpeech])

  const speak = useCallback(() => {
    cancel()
    setError(null)
    if (mutedRef.current || !enabledRef.current) return
    if (
      typeof window === 'undefined' ||
      !window.speechSynthesis ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      setError('이 브라우저는 질문 음성 재생을 지원하지 않습니다. 화면의 질문을 확인해주세요.')
      return
    }

    const generation = generationRef.current
    const utterance = new SpeechSynthesisUtterance(textRef.current)
    utterance.lang = 'ko-KR'
    utterance.rate = 1
    utterance.volume = Math.min(1, Math.max(0, volumeRef.current / 100))
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
  }, [cancel])

  useEffect(() => {
    const timer = window.setTimeout(speak, 0)
    return () => {
      window.clearTimeout(timer)
      invalidateSpeech()
    }
  }, [enabled, invalidateSpeech, speak, text])

  useEffect(() => {
    if (!muted) return

    invalidateSpeech()
    const timer = window.setTimeout(() => setIsSpeaking(false), 0)
    return () => window.clearTimeout(timer)
  }, [invalidateSpeech, muted])

  return { isSpeaking, error, replay: speak }
}

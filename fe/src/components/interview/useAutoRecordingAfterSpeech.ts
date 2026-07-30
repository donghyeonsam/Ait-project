import { useCallback, useEffect, useRef } from 'react'
import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'

interface UseAutoRecordingAfterSpeechOptions {
  questionKey: string
  completedSpeechKey: string | null
  enabled: boolean
  answerStatus: VoiceAnswerStatus
  startRecording: () => void
}

export function useAutoRecordingAfterSpeech({
  questionKey,
  completedSpeechKey,
  enabled,
  answerStatus,
  startRecording,
}: UseAutoRecordingAfterSpeechOptions) {
  const recordedQuestionRef = useRef<string | null>(null)

  useEffect(() => {
    if (
      completedSpeechKey !== questionKey ||
      !enabled ||
      answerStatus !== 'idle' ||
      recordedQuestionRef.current === questionKey
    ) {
      return
    }

    // StrictMode의 이펙트 재실행에서도 한 질문당 한 번만 자동 녹음한다.
    const timer = window.setTimeout(() => {
      if (recordedQuestionRef.current === questionKey) return
      recordedQuestionRef.current = questionKey
      startRecording()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [
    answerStatus,
    completedSpeechKey,
    enabled,
    questionKey,
    startRecording,
  ])

  return useCallback(() => {
    recordedQuestionRef.current = null
  }, [])
}

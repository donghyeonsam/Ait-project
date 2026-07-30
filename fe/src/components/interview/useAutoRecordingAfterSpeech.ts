import { useCallback, useLayoutEffect, useRef } from 'react'
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

  useLayoutEffect(() => {
    if (
      completedSpeechKey !== questionKey ||
      !enabled ||
      answerStatus !== 'idle' ||
      recordedQuestionRef.current === questionKey
    ) {
      return
    }

    // 브라우저가 중간 idle 화면을 그리기 전에 녹음을 시작하고,
    // StrictMode의 이펙트 재실행에서도 한 질문당 한 번만 실행한다.
    recordedQuestionRef.current = questionKey
    startRecording()
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

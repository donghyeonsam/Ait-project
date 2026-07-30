import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAutoRecordingAfterSpeech } from '@/components/interview/useAutoRecordingAfterSpeech'

describe('useAutoRecordingAfterSpeech', () => {
  it('현재 질문 TTS가 끝난 뒤 한 번만 녹음을 시작한다', () => {
    const startRecording = vi.fn()
    const { rerender } = renderHook(
      ({ completedSpeechKey }) =>
        useAutoRecordingAfterSpeech({
          questionKey: 'question-1',
          completedSpeechKey,
          enabled: true,
          answerStatus: 'idle',
          startRecording,
        }),
      { initialProps: { completedSpeechKey: null as string | null } },
    )

    expect(startRecording).not.toHaveBeenCalled()

    rerender({ completedSpeechKey: 'question-1' })
    expect(startRecording).toHaveBeenCalledTimes(1)

    rerender({ completedSpeechKey: 'question-1' })
    expect(startRecording).toHaveBeenCalledTimes(1)
  })

  it('마이크가 준비되지 않았으면 완료 신호가 있어도 시작하지 않는다', () => {
    const startRecording = vi.fn()
    const { rerender } = renderHook(
      ({ enabled }) =>
        useAutoRecordingAfterSpeech({
          questionKey: 'question-1',
          completedSpeechKey: 'question-1',
          enabled,
          answerStatus: 'idle',
          startRecording,
        }),
      { initialProps: { enabled: false } },
    )

    expect(startRecording).not.toHaveBeenCalled()

    rerender({ enabled: true })
    expect(startRecording).toHaveBeenCalledTimes(1)
  })
})

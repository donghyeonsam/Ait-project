import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAutoRecordingAfterSpeech } from '@/components/interview/useAutoRecordingAfterSpeech'

describe('useAutoRecordingAfterSpeech', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('현재 질문 TTS가 끝난 뒤 한 번만 녹음을 시작한다', () => {
    vi.useFakeTimers()
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

    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(startRecording).not.toHaveBeenCalled()

    rerender({ completedSpeechKey: 'question-1' })
    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(startRecording).toHaveBeenCalledTimes(1)

    rerender({ completedSpeechKey: 'question-1' })
    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(startRecording).toHaveBeenCalledTimes(1)
  })

  it('마이크가 준비되지 않았으면 완료 신호가 있어도 시작하지 않는다', () => {
    vi.useFakeTimers()
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

    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(startRecording).not.toHaveBeenCalled()

    rerender({ enabled: true })
    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(startRecording).toHaveBeenCalledTimes(1)
  })
})

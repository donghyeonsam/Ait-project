import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuestionSpeech } from '@/components/interview/useQuestionSpeech'

class MockSpeechSynthesisUtterance {
  text: string
  lang = ''
  rate = 1
  volume = 1
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(text: string) {
    this.text = text
  }
}

describe('useQuestionSpeech', () => {
  const speak = vi.fn((utterance: MockSpeechSynthesisUtterance) => {
    utterance.onstart?.()
  })
  const cancel = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    speak.mockClear()
    cancel.mockClear()
    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance)
    vi.stubGlobal('speechSynthesis', { speak, cancel })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('장치가 준비되면 설정된 음량으로 질문을 읽는다', () => {
    const { result, unmount } = renderHook(() =>
      useQuestionSpeech({
        text: '첫 번째 질문입니다.',
        volume: 70,
        muted: false,
        enabled: true,
      }),
    )

    act(() => vi.runOnlyPendingTimers())

    expect(speak).toHaveBeenCalledOnce()
    const utterance = speak.mock.calls[0]?.[0]
    expect(utterance?.text).toBe('첫 번째 질문입니다.')
    expect(utterance?.lang).toBe('ko-KR')
    expect(utterance?.volume).toBe(0.7)
    expect(result.current.isSpeaking).toBe(true)

    act(() => utterance?.onend?.())
    expect(result.current.isSpeaking).toBe(false)
    unmount()
  })
})

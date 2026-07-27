import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { synthesizeQuestionSpeech, ttsResponseToBlob } from '@/api/speech'
import { useQuestionSpeech } from '@/components/interview/useQuestionSpeech'

vi.mock('@/api/speech', () => ({
  synthesizeQuestionSpeech: vi.fn(),
  ttsResponseToBlob: vi.fn(),
}))

const audioInstances: MockAudio[] = []
let playBlocked = false

class MockAudio {
  src = ''
  volume = 1
  onplay: (() => void) | null = null
  onended: (() => void) | null = null
  onpause: (() => void) | null = null

  constructor() {
    audioInstances.push(this)
  }

  async play() {
    if (playBlocked) throw new DOMException('blocked', 'NotAllowedError')
    this.onplay?.()
  }

  pause() {
    this.onpause?.()
  }
}

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

// 이펙트의 setTimeout(speak, 0)과 TTS fetch 프라미스를 함께 흘려보낸다.
async function flushSpeech() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function renderQuestionSpeech(text = '첫 번째 질문입니다.') {
  return renderHook(
    (props: { text: string; volume: number; muted: boolean }) =>
      useQuestionSpeech({ ...props, enabled: true }),
    { initialProps: { text, volume: 70, muted: false } },
  )
}

describe('useQuestionSpeech', () => {
  const createObjectURL = vi.fn(() => 'blob:question-audio')
  const revokeObjectURL = vi.fn()
  const speak = vi.fn((utterance: MockSpeechSynthesisUtterance) => {
    utterance.onstart?.()
  })
  const cancel = vi.fn()

  beforeEach(() => {
    audioInstances.length = 0
    playBlocked = false
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    speak.mockClear()
    cancel.mockClear()
    vi.mocked(synthesizeQuestionSpeech).mockReset()
    vi.mocked(synthesizeQuestionSpeech).mockResolvedValue({
      audioBase64: 'AAAA',
      format: 'mp3',
    })
    vi.mocked(ttsResponseToBlob).mockReset()
    vi.mocked(ttsResponseToBlob).mockReturnValue(
      new Blob(['mp3'], { type: 'audio/mpeg' }),
    )
    vi.stubGlobal('Audio', MockAudio)
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance)
    vi.stubGlobal('speechSynthesis', { speak, cancel })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('질문 텍스트를 TTS mp3로 받아 설정된 음량으로 재생한다', async () => {
    const { result, unmount } = renderQuestionSpeech()

    await flushSpeech()

    expect(synthesizeQuestionSpeech).toHaveBeenCalledWith('첫 번째 질문입니다.')
    const audio = audioInstances[0]
    expect(audio?.src).toBe('blob:question-audio')
    expect(audio?.volume).toBe(0.7)
    expect(result.current.isSpeaking).toBe(true)

    act(() => audio?.onended?.())
    expect(result.current.isSpeaking).toBe(false)
    unmount()
  })

  it('같은 질문의 replay는 캐시를 사용해 API를 다시 호출하지 않는다', async () => {
    const { result, unmount } = renderQuestionSpeech()
    await flushSpeech()
    expect(synthesizeQuestionSpeech).toHaveBeenCalledTimes(1)

    await act(async () => result.current.replay())

    expect(synthesizeQuestionSpeech).toHaveBeenCalledTimes(1)
    expect(result.current.isSpeaking).toBe(true)
    unmount()
  })

  it('TTS API가 실패하면 브라우저 음성 합성으로 폴백한다', async () => {
    vi.mocked(synthesizeQuestionSpeech).mockRejectedValue(new Error('tts down'))

    const { result, unmount } = renderQuestionSpeech()
    await flushSpeech()

    expect(speak).toHaveBeenCalledTimes(1)
    const utterance = speak.mock.calls[0]?.[0]
    expect(utterance?.text).toBe('첫 번째 질문입니다.')
    expect(utterance?.lang).toBe('ko-KR')
    expect(result.current.isSpeaking).toBe(true)
    unmount()
  })

  it('autoplay 차단은 폴백 대신 질문 다시 듣기를 안내한다', async () => {
    playBlocked = true
    const { result, unmount } = renderQuestionSpeech()
    await flushSpeech()

    expect(result.current.error).toContain('질문 다시 듣기')
    expect(speak).not.toHaveBeenCalled()
    expect(result.current.isSpeaking).toBe(false)

    playBlocked = false
    await act(async () => result.current.replay())

    expect(result.current.error).toBeNull()
    expect(result.current.isSpeaking).toBe(true)
    unmount()
  })

  it('음소거하면 재생을 멈춘다', async () => {
    const { result, rerender, unmount } = renderQuestionSpeech()
    await flushSpeech()
    expect(result.current.isSpeaking).toBe(true)

    rerender({ text: '첫 번째 질문입니다.', volume: 70, muted: true })
    await flushSpeech()

    expect(result.current.isSpeaking).toBe(false)
    unmount()
  })

  it('unmount 시 캐시된 objectURL을 전부 해제한다', async () => {
    const { unmount } = renderQuestionSpeech()
    await flushSpeech()

    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:question-audio')
  })
})

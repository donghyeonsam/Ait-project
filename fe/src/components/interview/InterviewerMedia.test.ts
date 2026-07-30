import { describe, expect, it } from 'vitest'
import {
  getInterviewerPhase,
  getInterviewerPlaylist,
} from '@/components/interview/interviewer-media'

describe('InterviewerMedia', () => {
  it('답변 녹음 중에는 중립 영상만 사용한다', () => {
    const playlist = getInterviewerPlaylist('neutral')

    expect(playlist.length).toBeGreaterThan(0)
    expect(playlist.every((source) => source.includes('neutrality'))).toBe(true)
  })

  it('질문·답변 상태에 맞는 영상 단계를 결정한다', () => {
    expect(
      getInterviewerPhase({
        questionIndex: 0,
        answerStatus: 'idle',
        isAiSpeaking: false,
        isSubmittingAnswer: false,
        isLastQuestion: false,
      }),
    ).toBe('intro')
    expect(
      getInterviewerPhase({
        questionIndex: 1,
        answerStatus: 'recording',
        isAiSpeaking: false,
        isSubmittingAnswer: false,
        isLastQuestion: false,
      }),
    ).toBe('neutral')
    expect(
      getInterviewerPhase({
        questionIndex: 2,
        answerStatus: 'review',
        isAiSpeaking: false,
        isSubmittingAnswer: true,
        isLastQuestion: true,
      }),
    ).toBe('outro')
  })
})

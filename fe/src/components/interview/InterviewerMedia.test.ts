import { describe, expect, it } from 'vitest'
import {
  getInterviewerPhase,
  getInterviewerPlaylist,
} from '@/components/interview/interviewer-media'

describe('InterviewerMedia', () => {
  it('답변 녹음 중에는 선택한 면접 유형의 리액션 영상을 사용한다', () => {
    const peaceful = getInterviewerPlaylist('listening', '평화형')
    const pressure = getInterviewerPlaylist('listening', '압박형')

    expect(peaceful.some((source) => source.includes('big_smile'))).toBe(true)
    expect(peaceful.some((source) => source.includes('negative'))).toBe(false)
    expect(pressure.some((source) => source.includes('negative'))).toBe(true)
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
    ).toBe('listening')
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

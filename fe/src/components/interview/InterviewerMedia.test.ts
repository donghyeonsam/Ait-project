import { describe, expect, it } from 'vitest'
import {
  getInterviewerPhase,
  getInterviewerPlaylist,
} from '@/components/interview/interviewer-media'

describe('InterviewerMedia', () => {
  it('면접 진행 중에는 평시 영상을 90% 이상 사용하고 인사를 제외한다', () => {
    const playlist = getInterviewerPlaylist('active')
    const neutralClips = playlist.filter((source) => source.includes('평시'))
    const neutral1Clips = playlist.filter((source) => source.includes('평시1'))
    const neutral2Clips = playlist.filter((source) => source.includes('평시2'))

    expect(neutralClips.length / playlist.length).toBeGreaterThanOrEqual(0.9)
    expect(neutral2Clips).toHaveLength(24)
    expect(neutral1Clips).toHaveLength(3)
    expect(playlist.some((source) => source.includes('눈 2번 깜빡임'))).toBe(true)
    expect(playlist.some((source) => source.includes('숨쉬기'))).toBe(true)
    expect(playlist.some((source) => source.includes('큰숨'))).toBe(true)
    expect(playlist.every((source) => !source.includes('인사'))).toBe(true)
  })

  it('인사 영상은 마지막 답변을 제출하는 종료 단계에서만 사용한다', () => {
    expect(getInterviewerPlaylist('outro')).toEqual([
      '/interviewer_video/인사.mp4',
    ])
    expect(
      getInterviewerPhase({
        answerStatus: 'recording',
        isAiSpeaking: false,
        isSubmittingAnswer: false,
        isLastQuestion: true,
      }),
    ).toBe('active')
    expect(
      getInterviewerPhase({
        answerStatus: 'review',
        isAiSpeaking: false,
        isSubmittingAnswer: true,
        isLastQuestion: false,
      }),
    ).toBe('active')
    expect(
      getInterviewerPhase({
        answerStatus: 'review',
        isAiSpeaking: false,
        isSubmittingAnswer: true,
        isLastQuestion: true,
      }),
    ).toBe('outro')
  })
})

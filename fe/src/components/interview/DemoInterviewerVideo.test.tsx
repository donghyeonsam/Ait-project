import { describe, expect, it } from 'vitest'
import { selectListeningVideo } from '@/components/interview/demo-interviewer-videos'

describe('selectListeningVideo', () => {
  it.each([
    [0, '/interviewer_video/평시_깜빡임3회.mp4', 'primary'],
    [0.4999, '/interviewer_video/평시_깜빡임3회.mp4', 'primary'],
    [0.5, '/interviewer_video/평시_눈 2번 깜빡임.mp4', 'reaction'],
    [0.6999, '/interviewer_video/평시_눈 2번 깜빡임.mp4', 'reaction'],
    [0.7, '/interviewer_video/평시_숨쉬기.mp4', 'primary'],
    [0.8999, '/interviewer_video/평시_숨쉬기.mp4', 'primary'],
  ])(
    '가중치 경계 %s에서 지정된 영상을 선택한다',
    (randomValue, src, category) => {
      expect(selectListeningVideo(() => randomValue)).toEqual({
        src,
        category,
      })
    },
  )

  it('나머지 10%를 인사 외 반응 영상 세 개에 같은 비중으로 배분한다', () => {
    expect(selectListeningVideo(() => 0.9).src).toBe(
      '/interviewer_video/깜빡임+끄덕임.mp4',
    )
    expect(selectListeningVideo(() => 0.95).src).toBe(
      '/interviewer_video/끄덕임.mp4',
    )
    expect(selectListeningVideo(() => 0.98).src).toBe(
      '/interviewer_video/큰숨.mp4',
    )
  })

  it('인사 영상은 선택하지 않는다', () => {
    const sampledSources = Array.from({ length: 101 }, (_, index) =>
      selectListeningVideo(() => index / 100).src,
    )

    expect(sampledSources).not.toContain('/interviewer_video/인사.mp4')
  })
})

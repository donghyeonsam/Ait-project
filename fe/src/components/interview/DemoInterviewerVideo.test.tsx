import { describe, expect, it } from 'vitest'
import { selectListeningVideo } from '@/components/interview/demo-interviewer-videos'

function sequenceRandom(...values: number[]) {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)] ?? 0
}

describe('selectListeningVideo', () => {
  it('80% 구간에서는 두 평시 영상을 같은 비중으로 선택한다', () => {
    const breathing = selectListeningVideo(sequenceRandom(0.79, 0))
    const blinking = selectListeningVideo(sequenceRandom(0.79, 0.99))

    expect(breathing).toEqual({
      src: '/interviewer_video/평시_숨쉬기.mp4',
      category: 'primary',
    })
    expect(blinking).toEqual({
      src: '/interviewer_video/평시_깜빡임3회.mp4',
      category: 'primary',
    })
  })

  it('나머지 20% 구간에서는 반응 영상을 선택한다', () => {
    const selection = selectListeningVideo(sequenceRandom(0.8, 0))

    expect(selection).toEqual({
      src: '/interviewer_video/평시_눈 2번 깜빡임.mp4',
      category: 'reaction',
    })
  })

  it('반응 영상이 이미 재생된 답변에서는 평시 영상만 선택한다', () => {
    const selection = selectListeningVideo(sequenceRandom(0.99, 0), false)

    expect(selection.category).toBe('primary')
    expect(selection.src).toBe('/interviewer_video/평시_깜빡임3회.mp4')
  })
})

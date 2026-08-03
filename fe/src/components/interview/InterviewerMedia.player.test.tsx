import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { InterviewerMedia } from '@/components/interview/InterviewerMedia'

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
}))

describe('InterviewerMedia buffered playback', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('다음 영상을 미리 준비하고 이전 프레임 위로 겹쳐 전환한다', async () => {
    const { container } = render(
      <InterviewerMedia
        interviewStyle="밸런스형"
        answerStatus="recording"
        isAiSpeaking={false}
        isSubmittingAnswer={false}
        isLastQuestion={false}
      />,
    )
    const videos = container.querySelectorAll('video.interviewer-media-video')

    expect(videos).toHaveLength(2)
    expect(videos[0]).toHaveClass('opacity-100')
    expect(videos[1]).toHaveClass('opacity-0')

    fireEvent.ended(videos[0])

    await waitFor(() => {
      expect(videos[1]).toHaveStyle({ zIndex: '2' })
    })
    expect(videos[0]).toHaveClass('opacity-100')
    expect(videos[1]).toHaveClass('opacity-100')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })
})

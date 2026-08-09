import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionTheater } from '@/components/interview/SessionTheater'

vi.mock('@/components/interview/DeviceControlBar', () => ({
  DeviceControlBar: () => null,
}))
vi.mock('@/components/interview/FloatingSelfView', () => ({
  FloatingSelfView: () => (
    <div
      className="session-theater-self-view"
      data-testid="session-self-view"
    />
  ),
}))
const defaultProps: ComponentProps<typeof SessionTheater> = {
  stream: null,
  questionIndex: 0,
  totalQuestions: 3,
  question: '협업 중 갈등을 해결한 경험을 말해주세요.',
  answerStatus: 'idle',
  isSubmittingAnswer: false,
  answerDurationSeconds: 60,
  answerSecondsRemaining: 60,
  transcript: '',
  onChangeTranscript: vi.fn(),
  voiceError: null,
  speechError: null,
  mediaPermission: 'granted',
  onRetryMediaAccess: vi.fn(),
  primaryActionLabel: '답변 제출',
  primaryActionDisabled: true,
  onPrimaryAction: vi.fn(),
  onFinishAnswer: vi.fn(),
  isAiSpeaking: false,
  onReplayQuestion: vi.fn(),
  replayDisabled: false,
  onRequestEnd: vi.fn(),
  micMuted: false,
  micGain: 70,
  onToggleMicMuted: vi.fn(),
  onChangeMicGain: vi.fn(),
  speakerMuted: false,
  speakerVolume: 70,
  onToggleSpeakerMuted: vi.fn(),
  onChangeSpeakerVolume: vi.fn(),
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SessionTheater recording controls', () => {
  it('답변 상태가 전환되어도 헤더·질문 카드·내 화면을 유지한다', () => {
    const { container, rerender } = render(
      <SessionTheater {...defaultProps} />,
    )
    const media = container.querySelector('.interviewer-media')
    const selfView = screen.getByTestId('session-self-view')
    const header = container.querySelector('.session-theater-header')
    const primaryRow = container.querySelector<HTMLElement>(
      '.session-theater-primary-row',
    )
    const bottom = container.querySelector('.session-theater-bottom')
    const glassCard = container.querySelector<HTMLElement>(
      '.session-theater-glass-card',
    )
    const controls = container.querySelector<HTMLElement>(
      '.session-theater-controls-row',
    )

    expect(media).toHaveClass('interviewer-media')
    expect(selfView).toHaveClass('session-theater-self-view')
    expect(primaryRow).toContainElement(selfView)
    expect(primaryRow).toContainElement(controls)
    expect(glassCard).not.toContainElement(controls)
    expect(screen.queryByRole('heading', { name: '실시간 답변' })).toBeNull()
    expect(header).toHaveClass('session-theater-header')
    expect(bottom).toHaveClass('session-theater-bottom')
    expect(bottom).toHaveAttribute('data-answer-state', 'idle')

    rerender(
      <SessionTheater
        {...defaultProps}
        answerStatus="recording"
        answerSecondsRemaining={42}
      />,
    )
    expect(screen.getByRole('timer')).toBeVisible()
    expect(screen.getByRole('heading', { name: '실시간 답변' })).toBeVisible()
    expect(
      screen.getByText(
        '실시간 답변 기록 중 · 시간이 끝나면 자동 종료됩니다.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '질문 다시 듣기' })).toBeVisible()
  })

  it('녹음 중에는 답변 종료 버튼으로 답변을 일찍 마칠 수 있다', () => {
    const onFinishAnswer = vi.fn()
    const { rerender } = render(<SessionTheater {...defaultProps} />)

    expect(screen.queryByRole('button', { name: '답변 제출' })).toBeNull()
    expect(screen.queryByRole('button', { name: '답변 종료' })).toBeNull()

    rerender(
      <SessionTheater
        {...defaultProps}
        answerStatus="recording"
        answerSecondsRemaining={42}
        onFinishAnswer={onFinishAnswer}
      />,
    )

    expect(screen.getByRole('timer')).toHaveAccessibleName('답변 시간 42초 남음')
    fireEvent.click(screen.getByRole('button', { name: '답변 종료' }))
    expect(onFinishAnswer).toHaveBeenCalledOnce()
  })

  it('음성 변환 검토 단계에서는 답변 제출 버튼만 표시한다', () => {
    const onChangeTranscript = vi.fn()
    render(
      <SessionTheater
        {...defaultProps}
        answerStatus="review"
        transcript="정리된 답변입니다."
        onChangeTranscript={onChangeTranscript}
        primaryActionDisabled={false}
      />,
    )

    fireEvent.change(screen.getByLabelText('답변 텍스트'), {
      target: { value: '수정한 답변입니다.' },
    })

    expect(
      screen.getByLabelText('답변 텍스트').closest(
        '.session-theater-transcript-panel',
      ),
    ).not.toBeNull()
    expect(onChangeTranscript).toHaveBeenCalledWith('수정한 답변입니다.')
    expect(
      screen.getByText('답변 내용을 수정한 뒤 답변 제출을 눌러주세요.'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '답변 제출' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '답변 종료' })).toBeNull()
  })

  it('질문 중에는 사진을 유지하고 답변 경청 영상을 순환 재생한다', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { container, rerender } = render(
      <SessionTheater {...defaultProps} isAiSpeaking />,
    )

    expect(screen.getByText(defaultProps.question)).toBeVisible()
    expect(screen.getByAltText('AI 면접관')).toBeVisible()
    expect(container.querySelector('video')).toBeNull()

    rerender(<SessionTheater {...defaultProps} answerStatus="recording" />)

    const listeningVideo = await waitFor(() => {
      const video = container.querySelector<HTMLVideoElement>(
        'video[src="/interviewer_video/평시_깜빡임3회.mp4"]',
      )
      expect(video).not.toBeNull()
      return video!
    })
    expect(listeningVideo.muted).toBe(true)
    fireEvent.playing(listeningVideo)
    expect(listeningVideo).toHaveClass('is-active')

    random.mockReturnValue(0.5)
    fireEvent.ended(listeningVideo)

    const nextListeningVideo = await waitFor(() => {
      const video = container.querySelector<HTMLVideoElement>(
        'video[src="/interviewer_video/평시_눈 2번 깜빡임.mp4"]',
      )
      expect(video).not.toBeNull()
      return video!
    })
    fireEvent.playing(nextListeningVideo)
    expect(nextListeningVideo).toHaveClass('is-active')
  })
})

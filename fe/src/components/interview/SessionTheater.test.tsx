import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
vi.mock('@/components/interview/InterviewerMedia', () => ({
  InterviewerMedia: () => (
    <div className="interviewer-media" data-testid="interviewer-media" />
  ),
}))

const defaultProps: ComponentProps<typeof SessionTheater> = {
  stream: null,
  questionIndex: 0,
  totalQuestions: 3,
  question: '협업 중 갈등을 해결한 경험을 말해주세요.',
  answerStatus: 'idle',
  interviewStyle: '밸런스형',
  isSubmittingAnswer: false,
  isLastQuestion: false,
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

describe('SessionTheater recording controls', () => {
  it('영상 상태가 전환되어도 헤더·질문 카드·내 화면을 유지한다', () => {
    const { container, rerender } = render(
      <SessionTheater {...defaultProps} />,
    )
    const media = screen.getByTestId('interviewer-media')
    const selfView = screen.getByTestId('session-self-view')
    const header = container.querySelector('.session-theater-header')
    const bottom = container.querySelector('.session-theater-bottom')

    expect(media).toHaveClass('interviewer-media')
    expect(selfView).toHaveClass('session-theater-self-view')
    expect(header).toHaveClass('session-theater-header')
    expect(bottom).toHaveClass('session-theater-bottom')

    rerender(
      <SessionTheater
        {...defaultProps}
        answerStatus="recording"
        answerSecondsRemaining={42}
      />,
    )
    expect(screen.getByRole('timer')).toBeVisible()
    expect(screen.getByRole('button', { name: '질문 다시 듣기' })).toBeVisible()
  })

  it('대기·녹음 중에는 수동 녹음 시작/종료 버튼을 표시하지 않는다', () => {
    const { rerender } = render(<SessionTheater {...defaultProps} />)

    expect(screen.queryByRole('button', { name: '답변 제출' })).toBeNull()

    rerender(
      <SessionTheater
        {...defaultProps}
        answerStatus="recording"
        answerSecondsRemaining={42}
      />,
    )

    expect(screen.getByRole('timer')).toHaveAccessibleName('답변 시간 42초 남음')
    expect(screen.queryByRole('button', { name: /녹음/ })).toBeNull()
  })

  it('음성 변환 검토 단계에서는 답변 제출 버튼만 표시한다', () => {
    render(
      <SessionTheater
        {...defaultProps}
        answerStatus="review"
        transcript="정리된 답변입니다."
        primaryActionDisabled={false}
      />,
    )

    expect(screen.getByRole('button', { name: '답변 제출' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /녹음/ })).toBeNull()
  })
})

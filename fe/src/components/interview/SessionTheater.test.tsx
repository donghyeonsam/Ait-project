import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionTheater } from '@/components/interview/SessionTheater'

vi.mock('@/components/interview/DeviceControlBar', () => ({
  DeviceControlBar: () => null,
}))
vi.mock('@/components/interview/FloatingSelfView', () => ({
  FloatingSelfView: () => null,
}))
vi.mock('@/components/interview/InterviewerMedia', () => ({
  InterviewerMedia: () => null,
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
  canRetryTranscription: false,
  onRetryTranscription: vi.fn(),
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

import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'

const VIDEO_ROOT = '/interviewer_video'

const VIDEO = {
  intro: `${VIDEO_ROOT}/start_point.mp4`,
  outro: `${VIDEO_ROOT}/end_point.mp4`,
  transition1: `${VIDEO_ROOT}/question_transfer_term_1.mp4`,
  transition2: `${VIDEO_ROOT}/question_transfer_term_2.mp4`,
  neutral1: `${VIDEO_ROOT}/listening_neutrality_1.mp4`,
  neutral2: `${VIDEO_ROOT}/listening_neutrality_2.mp4`,
  neutral3: `${VIDEO_ROOT}/listening_neutrality_3.mp4`,
  neutral4: `${VIDEO_ROOT}/listening_neutrality_4.mp4`,
  interest: `${VIDEO_ROOT}/listening_interest.mp4`,
  positive1: `${VIDEO_ROOT}/listening_positive_1.mp4`,
  positive2: `${VIDEO_ROOT}/listening_positive_2.mp4`,
  positive3: `${VIDEO_ROOT}/listening_positive_3.mp4`,
  bigSmile1: `${VIDEO_ROOT}/listening_big_smile_1.mp4`,
  bigSmile2: `${VIDEO_ROOT}/listening_big_smile_2.mp4`,
  negative1: `${VIDEO_ROOT}/listening_negative_1.mp4`,
  bigNegative2: `${VIDEO_ROOT}/listening_big_negative_2.mp4`,
} as const

export type InterviewerPhase =
  | 'intro'
  | 'asking'
  | 'neutral'
  | 'transition'
  | 'outro'

interface InterviewerPhaseState {
  questionIndex: number
  answerStatus: VoiceAnswerStatus
  isAiSpeaking: boolean
  isSubmittingAnswer: boolean
  isLastQuestion: boolean
}

const neutralClips = [
  VIDEO.neutral1,
  VIDEO.neutral2,
  VIDEO.neutral3,
  VIDEO.neutral4,
]

export function getInterviewerPlaylist(phase: InterviewerPhase) {
  if (phase === 'intro') return [VIDEO.intro]
  if (phase === 'outro') return [VIDEO.outro]
  if (phase === 'asking' || phase === 'transition') {
    return [VIDEO.transition1, VIDEO.transition2]
  }
  return neutralClips
}

export function getInterviewerPhase({
  questionIndex,
  answerStatus,
  isAiSpeaking,
  isSubmittingAnswer,
  isLastQuestion,
}: InterviewerPhaseState): InterviewerPhase {
  if (isSubmittingAnswer && isLastQuestion) return 'outro'
  if (isSubmittingAnswer) return 'transition'
  // 답변 녹음 중에는 면접 유형별 감정 리액션 없이 중립 영상만 보여준다.
  if (answerStatus === 'recording') return 'neutral'
  if (isAiSpeaking) return 'asking'
  if (answerStatus === 'processing' || answerStatus === 'review') return 'neutral'
  return questionIndex === 0 ? 'intro' : 'transition'
}

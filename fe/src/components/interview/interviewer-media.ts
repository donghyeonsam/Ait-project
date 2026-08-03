import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'

const VIDEO_ROOT = '/interviewer_video'

const VIDEO = {
  neutral1: `${VIDEO_ROOT}/평시1.mp4`,
  neutral2: `${VIDEO_ROOT}/평시2.mp4`,
  blink: `${VIDEO_ROOT}/눈 2번 깜빡임.mp4`,
  breathing: `${VIDEO_ROOT}/숨쉬기.mp4`,
  deepBreath: `${VIDEO_ROOT}/큰숨.mp4`,
  greeting: `${VIDEO_ROOT}/인사.mp4`,
} as const

export type InterviewerPhase = 'active' | 'outro'

interface InterviewerPhaseState {
  answerStatus: VoiceAnswerStatus
  isAiSpeaking: boolean
  isSubmittingAnswer: boolean
  isLastQuestion: boolean
}

const ACTIVE_PLAYLIST_LENGTH = 30
const accentClips = new Map([
  [9, VIDEO.blink],
  [19, VIDEO.breathing],
  [29, VIDEO.deepBreath],
])

// 면접 진행 중에는 30개 슬롯 중 27개(90%)를 평시 영상으로 유지한다.
// 나머지 슬롯에만 자연스러운 동작을 하나씩 섞고, 인사 영상은 포함하지 않는다.
const activePlaylist = Array.from(
  { length: ACTIVE_PLAYLIST_LENGTH },
  (_, index) =>
    accentClips.get(index) ??
    (index % 2 === 0 ? VIDEO.neutral1 : VIDEO.neutral2),
)

export function getInterviewerPlaylist(phase: InterviewerPhase) {
  return phase === 'outro' ? [VIDEO.greeting] : activePlaylist
}

export function getInterviewerPhase({
  isSubmittingAnswer,
  isLastQuestion,
}: InterviewerPhaseState): InterviewerPhase {
  return isSubmittingAnswer && isLastQuestion ? 'outro' : 'active'
}

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
const neutral1Slots = new Set([4, 14, 24])

// 면접 진행 중에는 30개 슬롯 중 27개(90%)를 평시 영상으로 유지한다.
// 평시2를 전체의 80%로 반복하고, 나머지 슬롯에 평시1과 자연스러운 동작을 섞는다.
const activePlaylist = Array.from(
  { length: ACTIVE_PLAYLIST_LENGTH },
  (_, index) =>
    accentClips.get(index) ??
    (neutral1Slots.has(index) ? VIDEO.neutral1 : VIDEO.neutral2),
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

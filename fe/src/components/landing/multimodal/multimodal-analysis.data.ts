import answerPaceImage from '@/assets/landing/multimodal/answer-pace.webp'
import expressionDetailImage from '@/assets/landing/multimodal/expression-detail.webp'
import gazeDetailImage from '@/assets/landing/multimodal/gaze-detail.webp'
import interviewCandidateImage from '@/assets/landing/multimodal/interview-candidate.webp'
import voiceMicrophoneImage from '@/assets/landing/multimodal/voice-microphone.webp'

export type MultimodalMetricId = 'gaze' | 'expression' | 'voice' | 'pace'

export interface MultimodalMetric {
  id: MultimodalMetricId
  label: string
  title: string
  description: string
  previewDescription: string
  thumbnailSrc: string
  thumbnailAlt: string
  thumbnailWidth: number
  thumbnailHeight: number
  previewSrc: string
  previewAlt: string
  previewWidth: number
  previewHeight: number
}

// 랜딩 화면에서 멀티모달 분석 방식을 설명하는 정적 예시 콘텐츠를 관리한다.
export const multimodalMetrics = [
  {
    id: 'gaze',
    label: '시선 처리',
    title: '시선의 집중도와 움직임',
    description: '시선의 집중도와 움직임을 분석해요.',
    previewDescription:
      '화면 중앙을 향한 시선 흐름을 구간별 관찰 신호로 보여줘요.',
    thumbnailSrc: gazeDetailImage,
    thumbnailAlt: '눈 주변의 시선 추적 예시',
    thumbnailWidth: 640,
    thumbnailHeight: 434,
    previewSrc: interviewCandidateImage,
    previewAlt: '카메라를 바라보며 답변하는 면접자 예시',
    previewWidth: 1672,
    previewHeight: 941,
  },
  {
    id: 'expression',
    label: '표정',
    title: '미세 표정과 얼굴 움직임',
    description: '미세 표정과 감정 변화를 파악해요.',
    previewDescription:
      '눈과 입 주변의 움직임을 관찰 포인트로 나누어 살펴봐요.',
    thumbnailSrc: expressionDetailImage,
    thumbnailAlt: '얼굴의 표정 포인트 분석 예시',
    thumbnailWidth: 640,
    thumbnailHeight: 640,
    previewSrc: expressionDetailImage,
    previewAlt: '눈과 입 주변의 표정 포인트를 확인하는 면접자 예시',
    previewWidth: 640,
    previewHeight: 640,
  },
  {
    id: 'voice',
    label: '음성',
    title: '목소리 톤과 발화 리듬',
    description: '목소리의 톤, 크기, 말하기 패턴을 분석해요.',
    previewDescription:
      '답변의 음량과 파형 변화를 시간 흐름에 따라 비교해요.',
    thumbnailSrc: voiceMicrophoneImage,
    thumbnailAlt: '마이크와 음성 파형 분석 예시',
    thumbnailWidth: 900,
    thumbnailHeight: 900,
    previewSrc: voiceMicrophoneImage,
    previewAlt: '마이크로 답변 음성을 분석하는 예시',
    previewWidth: 900,
    previewHeight: 900,
  },
  {
    id: 'pace',
    label: '답변 속도',
    title: '답변 속도와 말하기 리듬',
    description: '답변의 속도와 리듬을 측정해요.',
    previewDescription:
      '구간별 말하기 속도를 권장 범위와 함께 비교해 보여줘요.',
    thumbnailSrc: answerPaceImage,
    thumbnailAlt: '초시계와 답변 속도 그래프 예시',
    thumbnailWidth: 900,
    thumbnailHeight: 900,
    previewSrc: answerPaceImage,
    previewAlt: '답변 시간과 말하기 속도를 측정하는 예시',
    previewWidth: 900,
    previewHeight: 900,
  },
] as const satisfies readonly MultimodalMetric[]

export const multimodalStatMetrics = [
  {
    id: 'gaze-stability',
    label: '시선 안정도',
    value: '87%',
    progress: 87,
    emphasisFor: ['gaze'] as MultimodalMetricId[],
  },
  {
    id: 'front-gaze',
    label: '정면 응시',
    value: '92%',
    progress: 92,
    emphasisFor: ['gaze'] as MultimodalMetricId[],
  },
  {
    id: 'expression-state',
    label: '표정 상태',
    value: '표정 안정',
    emphasisFor: ['expression'] as MultimodalMetricId[],
  },
] as const

export const voiceRhythmMetrics = [
  { label: '평균 음량', value: '-18.7 dB' },
  { label: '말하기 속도', value: '152 WPM' },
  { label: '목소리 안정도', value: '92%' },
] as const

export const answerPaceData = [
  { label: '00:00', value: 110 },
  { label: '00:30', value: 168 },
  { label: '01:00', value: 122 },
  { label: '01:30', value: 176 },
  { label: '02:00', value: 116 },
  { label: '02:30', value: 154 },
  { label: '03:00', value: 128 },
] as const

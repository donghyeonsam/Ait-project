import {
  CS_TOPIC_MAX,
  type SurveyState,
} from '@/components/interview/useInterviewSurvey'
import {
  csTopicOptions,
  difficultyOptions,
  interviewGoalOptions,
  interviewStyleOptions,
  type CsTopic,
  type Difficulty,
  type InterviewGoalType,
  type InterviewStyle,
} from '@/mocks/interview'

export const INTERVIEW_INPUT_CONTRACT_VERSION = 1 as const

export interface InterviewReferenceSelection {
  coverLetterId: number | null
  repositoryIds: number[]
  retrievalScope: 'selected'
}

export interface InterviewInputContract {
  contractVersion: typeof INTERVIEW_INPUT_CONTRACT_VERSION
  interviewType: InterviewGoalType
  position: string | null
  careerLevel: string | null
  difficulty: Difficulty
  style: InterviewStyle
  csCategories: CsTopic[]
  references: InterviewReferenceSelection
}

export interface InterviewDevicePreferences {
  cameraDeviceId: string | null
  speakerDeviceId: string | null
  micDeviceId: string | null
  speakerVolume: number
  micGain: number
}

export interface InterviewSessionConfiguration {
  input: InterviewInputContract
  devices: InterviewDevicePreferences
}

export interface InterviewSessionNavigationState {
  interviewConfig: InterviewSessionConfiguration
}

function toOptionalText(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

function toDocumentId(value: string, fieldName: string) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`${fieldName} 값이 올바르지 않습니다.`)
  }
  return id
}

function isOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
): value is T {
  return typeof value === 'string' && options.includes(value as T)
}

function isNullableString(value: unknown) {
  return value === null || typeof value === 'string'
}

function isPositiveId(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isVolume(value: unknown) {
  return typeof value === 'number' && value >= 0 && value <= 100
}

export function createInterviewInputContract(
  state: SurveyState,
): InterviewInputContract {
  if (!state.interviewType || !state.difficulty || !state.style) {
    throw new Error('면접 유형, 난이도와 스타일을 모두 선택해주세요.')
  }
  if (state.csTopics.length > CS_TOPIC_MAX) {
    throw new Error(`CS 주제는 최대 ${CS_TOPIC_MAX}개까지 선택할 수 있습니다.`)
  }

  return {
    contractVersion: INTERVIEW_INPUT_CONTRACT_VERSION,
    interviewType: state.interviewType,
    position: toOptionalText(state.position),
    careerLevel: toOptionalText(state.careerLevel),
    difficulty: state.difficulty,
    style: state.style,
    // 단일 cs_category로 축소하지 않고 사용자가 선택한 주제를 모두 보존한다.
    csCategories: [...state.csTopics],
    references: {
      coverLetterId:
        state.coverLetterId === null
          ? null
          : toDocumentId(state.coverLetterId, '자기소개서 ID'),
      repositoryIds: state.repositoryIds.map((id) =>
        toDocumentId(id, '레포지토리 ID'),
      ),
      retrievalScope: 'selected',
    },
  }
}

export function createInterviewSessionNavigationState(
  state: SurveyState,
): InterviewSessionNavigationState {
  if (!state.deviceReady) {
    throw new Error('카메라와 마이크 환경 점검을 완료해주세요.')
  }

  return {
    interviewConfig: {
      input: createInterviewInputContract(state),
      devices: {
        cameraDeviceId: state.cameraDeviceId,
        speakerDeviceId: state.speakerDeviceId,
        micDeviceId: state.micDeviceId,
        speakerVolume: state.speakerVolume,
        micGain: state.micGain,
      },
    },
  }
}

export function isInterviewSessionConfiguration(
  value: unknown,
): value is InterviewSessionConfiguration {
  if (!value || typeof value !== 'object') return false

  const configuration = value as Partial<InterviewSessionConfiguration>
  const input = configuration.input
  const devices = configuration.devices
  const interviewTypes = interviewGoalOptions.map((option) => option.type)

  return Boolean(
    input &&
      input.contractVersion === INTERVIEW_INPUT_CONTRACT_VERSION &&
      isOneOf(input.interviewType, interviewTypes) &&
      isNullableString(input.position) &&
      isNullableString(input.careerLevel) &&
      isOneOf(input.difficulty, difficultyOptions) &&
      isOneOf(input.style, interviewStyleOptions) &&
      Array.isArray(input.csCategories) &&
      input.csCategories.length <= CS_TOPIC_MAX &&
      input.csCategories.every((category) =>
        isOneOf(category, csTopicOptions),
      ) &&
      input.references?.retrievalScope === 'selected' &&
      (input.references.coverLetterId === null ||
        isPositiveId(input.references.coverLetterId)) &&
      Array.isArray(input.references.repositoryIds) &&
      input.references.repositoryIds.every(isPositiveId) &&
      devices &&
      isNullableString(devices.cameraDeviceId) &&
      isNullableString(devices.speakerDeviceId) &&
      isNullableString(devices.micDeviceId) &&
      isVolume(devices.speakerVolume) &&
      isVolume(devices.micGain),
  )
}

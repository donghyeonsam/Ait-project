import { useCallback, useMemo, useState } from 'react'
import type {
  CsTopic,
  Difficulty,
  InterviewGoalType,
  InterviewStyle,
} from '@/mocks/interview'

export const SURVEY_STEP_LABELS = ['면접 유형', '지원 정보', '진행 방식', '최종 확인', '환경 설정'] as const
export const SURVEY_STEP_COUNT = SURVEY_STEP_LABELS.length
export const CS_TOPIC_MAX = 3

export interface SurveyState {
  interviewType: InterviewGoalType | null
  position: string
  careerLevel: string
  coverLetterId: string | null
  repositoryId: string | null
  csTopics: CsTopic[]
  difficulty: Difficulty | null
  style: InterviewStyle | null
  cameraDeviceId: string | null
  speakerDeviceId: string | null
  micDeviceId: string | null
  speakerVolume: number
  micGain: number
  deviceReady: boolean
}

const initialState: SurveyState = {
  interviewType: null,
  position: '',
  careerLevel: '',
  coverLetterId: null,
  repositoryId: null,
  csTopics: [],
  difficulty: null,
  style: null,
  cameraDeviceId: null,
  speakerDeviceId: null,
  micDeviceId: null,
  speakerVolume: 60,
  micGain: 60,
  deviceReady: false,
}

function needsApplyInfo(type: InterviewGoalType | null) {
  return type === '직무 면접' || type === '기술 면접' || type === '포폴 면접' || type === '종합'
}

function needsCsTopics(type: InterviewGoalType | null) {
  return type === 'CS 면접' || type === '종합'
}

function isApplyInfoValid(state: SurveyState) {
  return state.position.trim().length > 0 && state.careerLevel.trim().length > 0 && state.coverLetterId !== null
}

function isCsTopicsValid(state: SurveyState) {
  return state.csTopics.length >= 1
}

function isStepValid(step: number, state: SurveyState): boolean {
  switch (step) {
    case 1:
      return state.interviewType !== null
    case 2: {
      // 면접 유형을 고르기 전에는 요구 입력이 없어 공허하게 참이 되므로 미완료로 처리한다.
      if (state.interviewType === null) return false
      const applyOk = !needsApplyInfo(state.interviewType) || isApplyInfoValid(state)
      const csOk = !needsCsTopics(state.interviewType) || isCsTopicsValid(state)
      return applyOk && csOk
    }
    case 3:
      return state.difficulty !== null && state.style !== null
    case 4:
      // 최종 확인 단계는 입력이 없으므로 요약 대상인 1~3단계가 모두 채워지면 완료로 본다.
      return isStepValid(1, state) && isStepValid(2, state) && isStepValid(3, state)
    case 5:
      return state.deviceReady
    default:
      return false
  }
}

// 면접 설문의 입력 상태와 단계별 유효성 검사를 한데 모은 훅. 모든 단계는 한 화면에서 스크롤로 진행한다.
export function useInterviewSurvey() {
  const [state, setState] = useState<SurveyState>(initialState)

  const update = useCallback(<K extends keyof SurveyState>(key: K, value: SurveyState[K]) => {
    setState((previous) => {
      if (Object.is(previous[key], value)) {
        return previous
      }
      return { ...previous, [key]: value }
    })
  }, [])

  const selectRepository = useCallback((id: string) => {
    setState((previous) => ({
      ...previous,
      repositoryId: previous.repositoryId === id ? null : id,
    }))
  }, [])

  const toggleCsTopic = useCallback((topic: CsTopic) => {
    setState((previous) => {
      const isSelected = previous.csTopics.includes(topic)
      if (isSelected) {
        return { ...previous, csTopics: previous.csTopics.filter((item) => item !== topic) }
      }
      if (previous.csTopics.length >= CS_TOPIC_MAX) {
        return previous
      }
      return { ...previous, csTopics: [...previous.csTopics, topic] }
    })
  }, [])

  // 면접 유형을 바꾸면 그 유형에 해당하지 않는 입력(지원 정보·CS 주제)은 초기화한다.
  const selectInterviewType = useCallback((type: InterviewGoalType) => {
    setState((previous) => ({
      ...previous,
      interviewType: type,
      ...(needsApplyInfo(type) ? {} : { position: '', careerLevel: '', coverLetterId: null, repositoryId: null }),
      ...(needsCsTopics(type) ? {} : { csTopics: [] }),
    }))
  }, [])

  const stepValidity = useMemo(
    () => Array.from({ length: SURVEY_STEP_COUNT }, (_, index) => isStepValid(index + 1, state)),
    [state],
  )

  const firstIncompleteStep = useMemo(() => {
    const index = stepValidity.findIndex((valid) => !valid)
    return index === -1 ? null : index + 1
  }, [stepValidity])

  return {
    state,
    update,
    selectRepository,
    toggleCsTopic,
    selectInterviewType,
    stepValidity,
    firstIncompleteStep,
    allStepsValid: firstIncompleteStep === null,
    showApplyInfo: needsApplyInfo(state.interviewType),
    showCsTopics: needsCsTopics(state.interviewType),
  }
}

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

function isStepValid(step: number, state: SurveyState) {
  switch (step) {
    case 1:
      return state.interviewType !== null
    case 2: {
      const applyOk = !needsApplyInfo(state.interviewType) || isApplyInfoValid(state)
      const csOk = !needsCsTopics(state.interviewType) || isCsTopicsValid(state)
      return applyOk && csOk
    }
    case 3:
      return state.difficulty !== null && state.style !== null
    case 4:
      return true
    case 5:
      return state.deviceReady
    default:
      return false
  }
}

export function useInterviewSurvey() {
  const [currentStep, setCurrentStep] = useState(1)
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

  const selectInterviewType = useCallback((type: InterviewGoalType) => {
    setState((previous) => ({
      ...previous,
      interviewType: type,
      ...(needsApplyInfo(type) ? {} : { position: '', careerLevel: '', coverLetterId: null, repositoryId: null }),
      ...(needsCsTopics(type) ? {} : { csTopics: [] }),
    }))
  }, [])

  const currentStepValid = useMemo(() => isStepValid(currentStep, state), [currentStep, state])

  const goNext = useCallback(() => {
    setCurrentStep((step) => (isStepValid(step, state) && step < SURVEY_STEP_COUNT ? step + 1 : step))
  }, [state])

  const goPrevious = useCallback(() => {
    setCurrentStep((step) => Math.max(1, step - 1))
  }, [])

  return {
    currentStep,
    state,
    update,
    selectRepository,
    toggleCsTopic,
    selectInterviewType,
    currentStepValid,
    goNext,
    goPrevious,
    showApplyInfo: needsApplyInfo(state.interviewType),
    showCsTopics: needsCsTopics(state.interviewType),
  }
}

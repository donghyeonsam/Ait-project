import { useMemo, useState } from 'react'
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
  resumeId: string | null
  repositoryIds: string[]
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
  resumeId: null,
  repositoryIds: [],
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
  return state.position.trim().length > 0 && state.careerLevel.trim().length > 0 && state.resumeId !== null
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

  const update = <K extends keyof SurveyState>(key: K, value: SurveyState[K]) => {
    setState((previous) => ({ ...previous, [key]: value }))
  }

  const toggleRepository = (id: string) => {
    setState((previous) => ({
      ...previous,
      repositoryIds: previous.repositoryIds.includes(id)
        ? previous.repositoryIds.filter((repositoryId) => repositoryId !== id)
        : [...previous.repositoryIds, id],
    }))
  }

  const toggleCsTopic = (topic: CsTopic) => {
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
  }

  const selectInterviewType = (type: InterviewGoalType) => {
    setState((previous) => ({
      ...previous,
      interviewType: type,
      ...(needsApplyInfo(type) ? {} : { position: '', careerLevel: '', resumeId: null, repositoryIds: [] }),
      ...(needsCsTopics(type) ? {} : { csTopics: [] }),
    }))
  }

  const currentStepValid = useMemo(() => isStepValid(currentStep, state), [currentStep, state])

  const goNext = () => {
    if (!currentStepValid || currentStep >= SURVEY_STEP_COUNT) {
      return
    }
    setCurrentStep((step) => step + 1)
  }

  const goPrevious = () => {
    setCurrentStep((step) => Math.max(1, step - 1))
  }

  return {
    currentStep,
    state,
    update,
    toggleRepository,
    toggleCsTopic,
    selectInterviewType,
    currentStepValid,
    goNext,
    goPrevious,
    showApplyInfo: needsApplyInfo(state.interviewType),
    showCsTopics: needsCsTopics(state.interviewType),
  }
}

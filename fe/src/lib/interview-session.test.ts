import { describe, expect, it } from 'vitest'
import type { SurveyState } from '@/components/interview/useInterviewSurvey'
import {
  createInterviewInputContract,
  createInterviewSessionNavigationState,
  isInterviewSessionConfiguration,
} from '@/lib/interview-session'

const surveyState: SurveyState = {
  interviewType: '종합',
  position: ' 프론트엔드 개발자 ',
  careerLevel: ' 신입 ',
  coverLetterId: '11',
  repositoryIds: ['21', '22'],
  csTopics: ['네트워크', 'WEB', '데이터베이스'],
  difficulty: '보통',
  style: '밸런스형',
  cameraDeviceId: 'camera-1',
  speakerDeviceId: 'speaker-1',
  micDeviceId: 'mic-1',
  speakerVolume: 70,
  micGain: 65,
  deviceReady: true,
}

describe('createInterviewInputContract', () => {
  it('선택 문서 ID와 CS 주제 전체를 요청 계약에 보존한다', () => {
    const contract = createInterviewInputContract(surveyState)

    expect(contract).toMatchObject({
      contractVersion: 1,
      interviewType: '종합',
      position: '프론트엔드 개발자',
      careerLevel: '신입',
      difficulty: '보통',
      style: '밸런스형',
      csCategories: ['네트워크', 'WEB', '데이터베이스'],
      references: {
        coverLetterId: 11,
        repositoryIds: [21, 22],
        retrievalScope: 'selected',
      },
    })
  })
})

describe('createInterviewSessionNavigationState', () => {
  it('요청 계약과 장치 설정을 분리해 세션으로 전달한다', () => {
    const state = createInterviewSessionNavigationState(surveyState)

    expect(state.interviewConfig.input.references.repositoryIds).toEqual([21, 22])
    expect(state.interviewConfig.devices).toEqual({
      cameraDeviceId: 'camera-1',
      speakerDeviceId: 'speaker-1',
      micDeviceId: 'mic-1',
      speakerVolume: 70,
      micGain: 65,
    })
    expect(isInterviewSessionConfiguration(state.interviewConfig)).toBe(true)
    expect(isInterviewSessionConfiguration(surveyState)).toBe(false)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GeneratedInterviewQuestion } from '@/api/ai-interviews'
import {
  getDemoQuestionVideoSrc,
  isDemoInterviewAccount,
  isDemoPortfolioInterview,
  replaceDemoQuestions,
  resolveDemoFollowUpQuestion,
} from '@/lib/demo-interview'

const generatedQuestions: GeneratedInterviewQuestion[] = [
  {
    order: 1,
    question: 'AI가 생성한 첫 번째 질문',
    rubric: ['첫 번째 기준'],
    topic: '기존 주제',
    source: 'rag',
    depth: 0,
  },
  {
    order: 2,
    question: 'AI가 생성한 두 번째 질문',
    rubric: ['두 번째 기준'],
    topic: '기존 주제',
    source: 'rag',
    depth: 0,
  },
]

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('demo interview', () => {
  it('설정된 이메일 계정만 시연 계정으로 판단한다', () => {
    vi.stubEnv('VITE_DEMO_INTERVIEW_EMAIL', 'hj0543@gmail.com')

    expect(isDemoInterviewAccount('HJ0543@gmail.com')).toBe(true)
    expect(isDemoInterviewAccount('other@gmail.com')).toBe(false)
  })

  it('시연 계정이 포폴 면접을 선택했을 때만 고정 문항을 활성화한다', () => {
    vi.stubEnv('VITE_DEMO_INTERVIEW_EMAIL', 'hj0543@gmail.com')

    expect(
      isDemoPortfolioInterview('hj0543@gmail.com', '포폴 면접'),
    ).toBe(true)
    expect(isDemoPortfolioInterview('hj0543@gmail.com', '기술 면접')).toBe(
      false,
    )
  })

  it('시연 계정에서는 1번과 2번 질문을 고정 질문으로 교체한다', () => {
    const result = replaceDemoQuestions(generatedQuestions, true)

    expect(result[0]?.question).toContain('디스코드 알고리즘 봇')
    expect(result[1]?.question).toContain('비동기 로직과 예외 처리')
    expect(generatedQuestions[0]?.question).toBe('AI가 생성한 첫 번째 질문')
    expect(generatedQuestions[1]?.question).toBe('AI가 생성한 두 번째 질문')
  })

  it('시연 질문 순서와 꼬리 깊이에 맞는 질문 영상을 반환한다', () => {
    const [first, second] = replaceDemoQuestions(generatedQuestions, true)
    const followUp = resolveDemoFollowUpQuestion({
      enabled: true,
      answeredQuestion: first,
      generatedFollowUp: null,
    })

    expect(getDemoQuestionVideoSrc(first)).toBe(
      '/demo-interview-video/question_1.mp4',
    )
    expect(getDemoQuestionVideoSrc(followUp!)).toBe(
      '/demo-interview-video/question_1_follow.mp4',
    )
    expect(getDemoQuestionVideoSrc(second)).toBe(
      '/demo-interview-video/question_2.mp4',
    )
    expect(getDemoQuestionVideoSrc(generatedQuestions[0])).toBeNull()
  })

  it('일반 계정에서는 생성된 질문을 그대로 사용한다', () => {
    expect(replaceDemoQuestions(generatedQuestions, false)).toBe(generatedQuestions)
  })

  it('시연 계정의 1번 답변 뒤에는 고정 꼬리질문을 반환한다', () => {
    const firstQuestion = replaceDemoQuestions(generatedQuestions, true)[0]!
    const result = resolveDemoFollowUpQuestion({
      enabled: true,
      answeredQuestion: firstQuestion,
      generatedFollowUp: null,
    })

    expect(result?.question).toContain('명령어 처리')
    expect(result?.depth).toBe(1)
  })

  it('고정 꼬리질문 답변 뒤에는 추가 꼬리질문을 노출하지 않는다', () => {
    const firstQuestion = replaceDemoQuestions(generatedQuestions, true)[0]!
    const fixedFollowUp = resolveDemoFollowUpQuestion({
      enabled: true,
      answeredQuestion: firstQuestion,
      generatedFollowUp: null,
    })!

    expect(
      resolveDemoFollowUpQuestion({
        enabled: true,
        answeredQuestion: fixedFollowUp,
        generatedFollowUp: generatedQuestions[1]!,
      }),
    ).toBeNull()
  })
})

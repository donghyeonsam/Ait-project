import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  completeInterview,
  generateInterviewQuestions,
  submitInterviewAnswer,
} from '@/api/ai-interviews'
import type { InterviewInputContract } from '@/lib/interview-session'

const input: InterviewInputContract = {
  contractVersion: 2,
  interviewType: 'CS 면접',
  position: null,
  careerLevel: null,
  difficulty: '어려움',
  style: '압박형',
  csCategories: ['네트워크', 'WEB'],
  references: {
    resumeId: 3,
    coverLetterId: null,
    repositoryId: 9,
    retrievalScope: 'selected',
  },
}

describe('generateInterviewQuestions', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('면접 설정을 BE 질문 생성 계약으로 변환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          timestamp: '2026-07-23T00:00:00Z',
          path: '/api/ai-interviews',
          message: '사용자 입력 정보 기반 질문 리스트 생성 완료',
          data: {
            userId: 7,
            aiInterviewId: 101,
            interviewType: 'cs',
            questions: [
              {
                order: 1,
                question: 'TCP 연결 과정을 설명해주세요.',
                rubric: ['3-way handshake를 설명한다.'],
                topic: '네트워크',
                source: 'general',
              },
            ],
            ragUsed: true,
          },
          error: null,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateInterviewQuestions({
      input,
    })

    expect(result.questions[0]?.question).toContain('TCP')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/api/ai-interviews',
    )

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.method).toBe('POST')
    expect(JSON.parse(String(request.body))).toEqual({
      jobRole: null,
      experienceLevel: null,
      resumeId: 3,
      coverLetterId: null,
      githubRepoId: 9,
      interviewType: 'cs',
      csCategories: ['network', 'web'],
      difficulty: 'hard',
      aiAttitudeStyle: 'pressure',
    })
  })
})

describe('submitInterviewAnswer', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('질문 정보와 녹음 파일을 멀티파트로 전송하고 꼬리질문을 돌려받는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          timestamp: '2026-07-23T00:00:00Z',
          path: '/api/ai-interviews/101/answers',
          message: '사용자 답변 분석 완료',
          data: {
            isPass: false,
            nextQuestion: {
              order: 1,
              question: '혼잡 제어와 흐름 제어의 차이는 무엇인가요?',
              rubric: ['혼잡 제어를 설명한다.'],
              topic: '네트워크',
              source: 'general',
              depth: 1,
            },
          },
          error: null,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const question = {
      order: 1,
      question: 'TCP 연결 과정을 설명해주세요.',
      rubric: ['3-way handshake를 설명한다.'],
      topic: '네트워크',
      source: 'general',
    }
    const result = await submitInterviewAnswer({
      aiInterviewId: 101,
      input,
      question,
      answer: '3-way handshake로 연결을 수립합니다.',
      audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
    })

    expect(result.isPass).toBe(false)
    expect(result.nextQuestion?.depth).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/api/ai-interviews/101/answers',
    )

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.method).toBe('POST')
    expect(request.body).toBeInstanceOf(FormData)

    const formData = request.body as FormData
    const audioFile = formData.get('audioFile') as File
    expect(audioFile.name).toBe('answer.webm')

    const questionRequestBlob = formData.get('questionRequest') as Blob
    expect(questionRequestBlob.type).toBe('application/json')
    expect(JSON.parse(await questionRequestBlob.text())).toEqual({
      interviewType: 'cs',
      resumeId: 3,
      coverLetterId: null,
      githubRepoId: 9,
      question: { ...question, depth: 0 },
      answer: '3-way handshake로 연결을 수립합니다.',
    })
  })
})

describe('completeInterview', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('면접 종료를 POST로 알린다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          timestamp: '2026-08-01T00:00:00Z',
          path: '/api/ai-interviews/101/complete',
          message: '모의 면접이 종료되어 결과를 분석하고 있습니다.',
          data: null,
          error: null,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await completeInterview(101)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/api/ai-interviews/101/complete',
    )
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('POST')
  })
})

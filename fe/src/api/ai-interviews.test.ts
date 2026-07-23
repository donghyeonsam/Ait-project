import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateInterviewQuestions } from '@/api/ai-interviews'
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

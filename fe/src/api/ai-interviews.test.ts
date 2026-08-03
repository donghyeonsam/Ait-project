import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  completeInterview,
  generateInterviewQuestions,
  getInterviewReportDetail,
  getInterviewReports,
  sendNonVerbalData,
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
      depth: 0,
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
    expect((request.headers as Headers).has('Content-Type')).toBe(false)
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

describe('sendNonVerbalData', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('프레임을 snake_case 필드로 변환해 /non-verbal에 POST한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          timestamp: '2026-08-02T00:00:00Z',
          path: '/api/ai-interviews/101/non-verbal',
          message: '시선 및 표정 데이터 분석 요청 완료',
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

    await sendNonVerbalData({
      aiInterviewId: 101,
      screenWidth: 640,
      screenHeight: 480,
      fps: 5,
      durationSec: 12.4,
      frames: [
        {
          timestamp: 0.2,
          gaze_x: 320,
          gaze_y: 240,
          blendshapes: [0.1],
          ear: 0.3,
          mar: 0.1,
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/api/ai-interviews/101/non-verbal',
    )
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      screen_width: 640,
      screen_height: 480,
      fps: 5,
      duration_sec: 12.4,
      frames: [
        {
          timestamp: 0.2,
          gaze_x: 320,
          gaze_y: 240,
          blendshapes: [0.1],
          ear: 0.3,
          mar: 0.1,
        },
      ],
    })
  })
})

describe('getInterviewReports', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('리포트 목록을 화면 기록 모델로 바꾸고 직전 면접 대비 증감을 계산한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          timestamp: '2026-08-01T00:00:00Z',
          path: '/api/ai-interviews/result',
          message: '모의 면접 결과 목록을 조회했습니다.',
          data: [
            {
              aiInterviewId: 12,
              interviewType: 'cs',
              difficulty: 'hard',
              aiAttitudeStyle: 'pressure',
              status: 'done',
              score: 7.5,
              createdAt: '2026-07-31T10:00:00',
              endedAt: '2026-07-31T10:12:30',
            },
            {
              aiInterviewId: 11,
              interviewType: 'job',
              difficulty: 'normal',
              aiAttitudeStyle: 'realistic',
              status: 'done',
              score: 6.0,
              createdAt: '2026-07-29T09:00:00',
              endedAt: '2026-07-29T09:08:00',
            },
          ],
          error: null,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const records = await getInterviewReports()

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/api/ai-interviews/result',
    )
    expect(records).toEqual([
      {
        id: 12,
        date: '2026. 07. 31',
        type: 'CS',
        difficulty: '어려움',
        title: 'CS 면접',
        score: 7.5,
        delta: 1.5,
        duration: '12분 30초',
        status: 'completed',
      },
      {
        id: 11,
        date: '2026. 07. 29',
        type: '직무',
        difficulty: '보통',
        title: '직무 면접',
        score: 6.0,
        delta: 0,
        duration: '8분 00초',
        status: 'completed',
      },
    ])
  })
})

describe('getInterviewReportDetail', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  const detailResponse = (content: unknown) =>
    new Response(
      JSON.stringify({
        statusCode: 200,
        timestamp: '2026-08-01T00:00:00Z',
        path: '/api/ai-interviews/12/result',
        message: '모의 면접 결과 목록을 조회했습니다.',
        data: {
          aiInterviewId: 12,
          interviewType: 'cs',
          difficulty: 'hard',
          createdAt: '2026-07-31T10:00:00',
          content,
          eyeContactScore: 0,
          faceScore: 0,
          voiceScore: 6.7,
          qnaScore: 8.8,
          sentenceScore: 8.1,
          questions: [
            {
              questionId: 1,
              question: 'TCP 연결 과정을 설명해주세요.',
              userAnswer: '3-way handshake로 연결합니다.',
              aiAnswer: 'SYN, SYN-ACK, ACK 순서로 연결을 수립합니다.',
              feedback: '용어를 함께 설명하면 더 좋아요.',
            },
          ],
        },
        error: null,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )

  it('리포트 상세를 조회하고 content 객체를 그대로 사용한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      detailResponse({ strengths: ['구조가 명확해요'], weaknesses: ['수치를 더해보세요'] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const detail = await getInterviewReportDetail(12)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/api/ai-interviews/12/result',
    )
    expect(detail.content).toEqual({
      strengths: ['구조가 명확해요'],
      weaknesses: ['수치를 더해보세요'],
    })
    expect(detail.questions).toHaveLength(1)
  })

  it('content가 이중 인코딩된 문자열이어도 파싱해서 돌려준다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      detailResponse(JSON.stringify({ strengths: ['좋아요'], weaknesses: [] })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const detail = await getInterviewReportDetail(12)

    expect(detail.content).toEqual({ strengths: ['좋아요'], weaknesses: [] })
  })
})

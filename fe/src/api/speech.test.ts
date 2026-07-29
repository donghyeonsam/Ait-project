import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  transcribeAnswer,
  synthesizeQuestionSpeech,
  ttsResponseToBlob,
} from '@/api/speech'

function apiResponse(data: unknown) {
  return new Response(
    JSON.stringify({
      statusCode: 200,
      timestamp: '2026-07-23T00:00:00Z',
      path: '/api/ai-interviews/speech',
      message: 'ok',
      data,
      error: null,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

describe('transcribeAnswer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('녹음 Blob을 media part로 담아 STT 엔드포인트에 전송한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(apiResponse({ text: '전사된 답변입니다.' }))
    vi.stubGlobal('fetch', fetchMock)

    const blob = new Blob(['audio'], { type: 'audio/webm;codecs=opus' })
    const result = await transcribeAnswer(blob)

    expect(result.text).toBe('전사된 답변입니다.')
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/api/ai-interviews/speech/stt',
    )

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.method).toBe('POST')
    expect(request.body).toBeInstanceOf(FormData)

    const media = (request.body as FormData).get('media')
    expect(media).toBeInstanceOf(File)
    expect((media as File).name).toBe('answer.webm')

    // FormData 전송 시 Content-Type을 직접 지정하면 boundary가 빠져 BE 파싱이 깨진다.
    expect(new Headers(request.headers).has('Content-Type')).toBe(false)
  })

  it('mp4 녹음이면 파일명을 answer.mp4로 추론한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({ text: '답변' }))
    vi.stubGlobal('fetch', fetchMock)

    await transcribeAnswer(new Blob(['audio'], { type: 'audio/mp4' }))

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    const media = (request.body as FormData).get('media')
    expect((media as File).name).toBe('answer.mp4')
  })
})

describe('synthesizeQuestionSpeech', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('질문 텍스트를 question 필드 JSON으로 담아 TTS 엔드포인트에 전송한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(apiResponse({ audioData: 'AAAA' }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await synthesizeQuestionSpeech('자기소개를 해주세요.')

    expect(result.audioData).toBe('AAAA')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/tts')

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.method).toBe('POST')
    expect(JSON.parse(String(request.body))).toEqual({
      question: '자기소개를 해주세요.',
    })
  })
})

describe('ttsResponseToBlob', () => {
  it('base64 오디오를 audio/mpeg Blob으로 변환한다', async () => {
    const bytes = Uint8Array.from([73, 68, 51, 4, 0])
    const base64 = btoa(String.fromCharCode(...bytes))

    const blob = ttsResponseToBlob({ audioData: base64 })

    expect(blob.type).toBe('audio/mpeg')
    expect(blob.size).toBe(bytes.length)
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes)
  })
})

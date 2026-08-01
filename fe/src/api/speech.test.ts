import { afterEach, describe, expect, it, vi } from 'vitest'
import { synthesizeQuestionSpeech, ttsResponseToBlob } from '@/api/speech'

function apiResponse(data: unknown) {
  return new Response(
    JSON.stringify({
      statusCode: 200,
      timestamp: '2026-07-23T00:00:00Z',
      path: '/api/tts',
      message: 'ok',
      data,
      error: null,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

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

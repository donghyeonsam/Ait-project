import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/http'
import { analyzeFaceExpression } from '@/api/face-analysis'

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const payload = {
  fps: 5,
  duration_sec: 10,
  frames: [{ blendshapes: [0.1], ear: 0.3, mar: 0.1, deviation: 0.02 }],
}

describe('analyzeFaceExpression', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('성공 시 BE를 거치지 않고 /ai-evaluate/analyses/face로 직접 요청한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ score: 7.5 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await analyzeFaceExpression(payload)

    expect(result).toEqual({ score: 7.5 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/ai-evaluate/analyses/face',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    )
  })

  it('실패 응답의 detail 메시지를 ApiError로 던진다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: '얼굴이 검출된 프레임이 부족합니다.' }, 422))
    vi.stubGlobal('fetch', fetchMock)

    await expect(analyzeFaceExpression(payload)).rejects.toMatchObject({
      message: '얼굴이 검출된 프레임이 부족합니다.',
      status: 422,
    })
  })

  it('detail이 없으면 기본 오류 메시지를 사용한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 500 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    try {
      await analyzeFaceExpression(payload)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).message).toBe(
        '표정 분석 요청을 처리하지 못했습니다.',
      )
    }
  })
})

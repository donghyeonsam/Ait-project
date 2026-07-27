import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStudySessionConnection } from '@/api/study-sessions'

describe('createStudySessionConnection', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('세션 접속 정보 발급 엔드포인트를 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          timestamp: '2026-07-27T00:00:00Z',
          path: '/api/study-sessions/1/connection',
          message: '접속 정보 발급 완료',
          data: {
            sessionId: 1,
            groupId: 10,
            roomName: 'room-1',
            serverUrl: 'wss://livekit.example.com',
            participantToken: 'token-value',
            participantIdentity: 'user-7',
            participantName: '홍길동',
            role: 'MEMBER',
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

    const result = await createStudySessionConnection(1)

    expect(result.serverUrl).toBe('wss://livekit.example.com')
    expect(result.participantToken).toBe('token-value')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/api/study-sessions/1/connection',
    )

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.method).toBe('POST')
  })
})

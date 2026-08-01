import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStudySessionConnection,
  getStudySessionMembers,
} from '@/api/study-sessions'

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

describe('getStudySessionMembers', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('세션 참가자 목록과 제출 서류 번호를 돌려준다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          timestamp: '2026-07-30T00:00:00Z',
          path: '/api/study-sessions/1/members',
          message: '세션 참여자 목록 반환을 성공했습니다.',
          data: [
            {
              userId: 7,
              nickname: '홍길동',
              role: 'HOST',
              resumeId: 3,
              coverLetterId: 5,
            },
            {
              userId: 8,
              nickname: '김구미',
              role: 'MEMBER',
              resumeId: 4,
              coverLetterId: null,
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

    const result = await getStudySessionMembers(1)

    expect(result).toHaveLength(2)
    expect(result[0]?.role).toBe('HOST')
    expect(result[1]?.coverLetterId).toBeNull()
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/backend/api/study-sessions/1/members',
    )
  })
})

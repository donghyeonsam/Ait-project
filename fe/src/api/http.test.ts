import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearStoredAuth,
  getStoredAccessToken,
  writeStoredAuth,
} from '@/api/auth-storage'
import { backendRequest } from '@/api/http'

function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      statusCode: status,
      timestamp: '2026-07-23T00:00:00Z',
      path: '/api/test',
      message: status < 400 ? 'ok' : 'error',
      data,
      error: null,
    }),
    {
      status,
      headers: { 'content-type': 'application/json' },
    },
  )
}

describe('backendRequest', () => {
  beforeEach(() => {
    clearStoredAuth()
    vi.unstubAllGlobals()
  })

  it('401이면 토큰을 재발급하고 원 요청을 한 번 재시도한다', async () => {
    writeStoredAuth(
      'expired-token',
      { userId: 1, email: 'test@example.com', nickname: '테스터', role: 'USER' },
      false,
    )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(null, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'refreshed-token' }))
      .mockResolvedValueOnce(jsonResponse({ value: 'success' }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await backendRequest<{ value: string }>('/api/test')

    expect(result).toEqual({ value: 'success' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/backend/api/auth/reissue')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
    })
    const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Headers
    expect(retryHeaders.get('Authorization')).toBe('Bearer refreshed-token')
    expect(getStoredAccessToken()).toBe('refreshed-token')
    expect(window.localStorage.getItem('ait.access-token')).toBeNull()
    expect(window.sessionStorage.getItem('ait.access-token')).toBe('refreshed-token')
  })
})

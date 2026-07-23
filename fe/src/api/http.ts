import {
  getStoredAccessToken,
  updateStoredAccessToken,
} from '@/api/auth-storage'
import type { ApiRequestOptions, ApiResponse } from '@/api/types'

const backendBaseUrl = (import.meta.env.VITE_BE_API_URL ?? '/backend').replace(
  /\/$/,
  '',
)
const aiBaseUrl = (import.meta.env.VITE_AI_API_URL ?? '/ai').replace(/\/$/, '')

export const unauthorizedEvent = 'ait:unauthorized'

interface ReissueResponse {
  accessToken: string
}

let reissuePromise: Promise<boolean> | null = null

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback

  const value = payload as Record<string, unknown>
  if (typeof value.message === 'string' && value.message) return value.message
  if (typeof value.detail === 'string' && value.detail) return value.detail

  if (value.error && typeof value.error === 'object') {
    const error = value.error as Record<string, unknown>
    if (typeof error.message === 'string' && error.message) return error.message
  }

  return fallback
}

async function parseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (response.status === 204) return null
  if (contentType.includes('application/json')) return response.json() as Promise<unknown>
  const text = await response.text()
  return text || null
}

async function performReissue() {
  try {
    const response = await fetch(`${backendBaseUrl}/api/auth/reissue`, {
      method: 'POST',
      credentials: 'include',
    })
    const payload = await parseBody(response)
    if (!response.ok || !payload || typeof payload !== 'object') return false

    const accessToken = (payload as ApiResponse<ReissueResponse>).data?.accessToken
    return typeof accessToken === 'string' && Boolean(accessToken)
      ? updateStoredAccessToken(accessToken)
      : false
  } catch {
    return false
  }
}

function reissueAccessToken() {
  if (!reissuePromise) {
    reissuePromise = performReissue().finally(() => {
      reissuePromise = null
    })
  }
  return reissuePromise
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: ApiRequestOptions = {},
  retryUnauthorized = false,
  hasRetried = false,
): Promise<T> {
  const { authenticated = true, headers: suppliedHeaders, ...init } = options
  const headers = new Headers(suppliedHeaders)

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (authenticated) {
    const accessToken = getStoredAccessToken()
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })
  const payload = await parseBody(response)

  if (!response.ok) {
    if (
      response.status === 401 &&
      authenticated &&
      retryUnauthorized &&
      !hasRetried &&
      (await reissueAccessToken())
    ) {
      return request<T>(baseUrl, path, options, retryUnauthorized, true)
    }

    if (response.status === 401 && authenticated) {
      window.dispatchEvent(new Event(unauthorizedEvent))
    }
    throw new ApiError(
      extractErrorMessage(payload, '요청을 처리하지 못했습니다.'),
      response.status,
      payload,
    )
  }

  return payload as T
}

export async function backendRequest<T>(
  path: string,
  options?: ApiRequestOptions,
) {
  const response = await request<ApiResponse<T>>(
    backendBaseUrl,
    path,
    {
      ...options,
      credentials: options?.credentials ?? 'include',
    },
    true,
  )
  return response.data
}

export function aiRequest<T>(path: string, options?: ApiRequestOptions) {
  return request<T>(aiBaseUrl, path, {
    ...options,
    authenticated: false,
  })
}

export function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) {
    return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
  }
  return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

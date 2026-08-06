// 백엔드 HTTP 통신의 공통 계층. 인증 헤더 부착, 401 시 토큰 재발급·재시도, 공통 응답/에러 처리를 담당한다.
import {
  getStoredAccessToken,
  updateStoredAccessToken,
} from '@/api/auth-storage'
import type { ApiRequestOptions, ApiResponse } from '@/api/types'

const backendBaseUrl = (import.meta.env.VITE_BE_API_URL ?? '/backend').replace(
  /\/$/,
  '',
)

// 업로드된 파일은 API 서버가 아니라 EC2에 정적으로 저장되어 별도 도메인에서 바로 서빙된다.
const uploadsBaseUrl = (
  import.meta.env.VITE_UPLOADS_URL ?? 'https://i15d202.p.ssafy.io/download'
).replace(/\/$/, '')

// 프로필 사진은 게시글 첨부와 다른 정적 경로(uploads/profiles)에서 서빙된다.
const profileUploadsBaseUrl = (
  import.meta.env.VITE_PROFILE_UPLOADS_URL ?? 'https://i15d202.p.ssafy.io/uploads'
).replace(/\/$/, '')

export function getBackendAssetUrl(path: string) {
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
  return `${backendBaseUrl}/${path.replace(/^\/+/, '')}`
}

// 폴더 구분자는 유지하고 각 경로 조각만 인코딩해 서버 리소스 경로와 맞춘다.
const encodeStoredPath = (storedPath: string) =>
  storedPath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
    .replace(/^\/+/, '')

// storedFilename(예: boards/uuid.png)을 실제 업로드 파일 정적 URL로 변환한다.
export function getUploadedFileUrl(storedFilename: string) {
  if (/^https?:\/\//i.test(storedFilename) || storedFilename.startsWith('data:')) {
    return storedFilename
  }
  return `${uploadsBaseUrl}/${encodeStoredPath(storedFilename)}`
}

// profileImageUrl(예: profiles/uuid.png)을 실제 프로필 사진 정적 URL로 변환한다.
export function getProfileImageUrl(profileImagePath: string) {
  if (/^https?:\/\//i.test(profileImagePath) || profileImagePath.startsWith('data:')) {
    return profileImagePath
  }
  return `${profileUploadsBaseUrl}/${encodeStoredPath(profileImagePath)}`
}

const resolveBackendUrl = (pathOrUrl: string) => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (
    pathOrUrl === backendBaseUrl ||
    pathOrUrl.startsWith(`${backendBaseUrl}/`) ||
    pathOrUrl.startsWith('/backend/')
  ) {
    return pathOrUrl
  }
  return getBackendAssetUrl(pathOrUrl)
}

export function isBackendAssetUrl(source: string) {
  if (!source || source.startsWith('blob:') || source.startsWith('data:')) {
    return false
  }
  return (
    source.startsWith(getBackendAssetUrl('/images/')) ||
    source.startsWith('/backend/images/')
  )
}

export const unauthorizedEvent = 'ait:unauthorized'

interface ReissueResponse {
  accessToken: string
}

// 동시에 여러 요청이 401을 받아도 재발급은 한 번만 하도록 진행 중인 Promise를 공유한다.
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

// refresh 토큰(HttpOnly 쿠키)으로 새 access 토큰을 받아 저장한다. 성공 여부만 반환한다.
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
    // 401이면 토큰을 한 번 재발급해 재시도하고, 재발급까지 실패하면 로그아웃을 알린다.
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

async function requestBackendAsset(
  source: string,
  hasRetried = false,
): Promise<Blob> {
  // 인증이 필요한 BE 보호 리소스만 Bearer 토큰을 붙인다. 업로드 정적 파일은 별도 공개 도메인이라
  // 인증 헤더를 붙이면 CORS 사전 요청이 막힐 수 있다.
  const requiresAuth = isBackendAssetUrl(source)
  const headers = new Headers()
  if (requiresAuth) {
    const accessToken = getStoredAccessToken()
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  }

  // 기존 게시글에는 폴더 구분자까지 인코딩된 이미지 경로가 남아 있어 실제 리소스 경로로 복원한다.
  const normalizedSource = requiresAuth
    ? source.replace(/%2F/gi, '/')
    : source
  const response = await fetch(resolveBackendUrl(normalizedSource), {
    headers,
    credentials: requiresAuth ? 'include' : 'same-origin',
  })

  if (
    response.status === 401 &&
    requiresAuth &&
    !hasRetried &&
    (await reissueAccessToken())
  ) {
    return requestBackendAsset(source, true)
  }

  if (!response.ok) {
    const payload = await parseBody(response)
    if (response.status === 401 && requiresAuth) {
      window.dispatchEvent(new Event(unauthorizedEvent))
    }
    throw new ApiError(
      extractErrorMessage(payload, '이미지를 불러오지 못했습니다.'),
      response.status,
      payload,
    )
  }

  return response.blob()
}

// <img> 태그가 붙일 수 없는 Bearer 토큰을 fetch에 담아 보호된 이미지 원본을 읽는다.
export function fetchBackendAssetBlob(source: string) {
  return requestBackendAsset(source)
}

// 다양한 예외를 사용자에게 보여줄 한국어 메시지로 변환한다. TypeError는 네트워크 연결 실패로 간주한다.
export function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) {
    return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
  }
  return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

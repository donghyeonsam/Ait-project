// 표정 분석 서버(ai-evaluate) 클라이언트. BE를 거치지 않고 브라우저가 직접 호출한다.
// (영상 자체는 서버로 올라가지 않고, 프레임별 수치 벡터만 전송한다.)
import { ApiError } from '@/api/http'

// MediaPipe FaceLandmarker의 blendshape 개수(고정). ai-evaluate 스키마와 동일하다.
export const FACE_BLENDSHAPE_COUNT = 52

export interface FaceFrame {
  /** MediaPipe blendshape 52개 스코어(0~1). categories 배열 순서를 그대로 유지해야 한다. */
  blendshapes: number[]
  ear: number
  mar: number
  deviation: number
}

export interface FaceAnalyzeRequest {
  fps: number
  duration_sec: number
  frames: FaceFrame[]
}

export interface FaceAnalyzeResult {
  score: number
}

const aiEvaluateBaseUrl = (
  import.meta.env.VITE_AI_EVALUATE_API_URL ?? '/ai-evaluate'
).replace(/\/$/, '')

function extractDetail(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object') return fallback
  const detail = (body as { detail?: unknown }).detail
  return typeof detail === 'string' && detail ? detail : fallback
}

// 답변 구간의 표정 프레임 묶음을 보내 표정 점수를 즉시 받는다(음성과 달리 폴링 없이 동기 응답).
export async function analyzeFaceExpression(
  payload: FaceAnalyzeRequest,
  signal?: AbortSignal,
): Promise<FaceAnalyzeResult> {
  const response = await fetch(`${aiEvaluateBaseUrl}/analyses/face`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (!response.ok) {
    throw new ApiError(
      extractDetail(body, '표정 분석 요청을 처리하지 못했습니다.'),
      response.status,
      body,
    )
  }

  return body as FaceAnalyzeResult
}

import {
  generateInterviewQuestions,
  type InterviewQuestionGenerationResponse,
} from '@/api/ai-interviews'
import type { InterviewInputContract } from '@/lib/interview-session'

// 설문 완료(장치 설정 진입) 시점에 시작한 질문 생성 요청을 세션 페이지 진입 전까지 보관해 재사용한다.
interface CacheEntry {
  key: string
  promise: Promise<InterviewQuestionGenerationResponse>
}

let cacheEntry: CacheEntry | null = null

function toCacheKey(input: InterviewInputContract) {
  return JSON.stringify(input)
}

export function prefetchInterviewQuestions(input: InterviewInputContract) {
  const key = toCacheKey(input)
  if (cacheEntry?.key === key) {
    return cacheEntry.promise
  }
  const promise = generateInterviewQuestions({ input })
  cacheEntry = { key, promise }
  return promise
}

export function getCachedInterviewQuestions(input: InterviewInputContract) {
  const key = toCacheKey(input)
  return cacheEntry?.key === key ? cacheEntry.promise : null
}

export function clearInterviewQuestionCache() {
  cacheEntry = null
}

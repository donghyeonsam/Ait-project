// 인증 이미지 blob을 URL 키로 캐시해 탭 전환·목록 재렌더·뷰어 탐색 때 같은 원본을 다시 받지 않는다.
import { fetchBackendAssetBlob } from '@/api/http'

// 원본 이미지가 수 MB일 수 있어 메모리 사용을 항목 수로 제한한다.
const MAX_ENTRIES = 40

// Map의 삽입 순서로 가장 오래 안 쓴 항목부터 비우는 단순 LRU. 값이 Promise라 진행 중인 요청도 공유된다.
const cache = new Map<string, Promise<Blob>>()

export function fetchAssetBlobCached(url: string): Promise<Blob> {
  const cached = cache.get(url)
  if (cached) {
    // 최근 사용으로 순서를 갱신해 눈앞의 이미지가 먼저 밀려나지 않게 한다.
    cache.delete(url)
    cache.set(url, cached)
    return cached
  }

  const request = fetchBackendAssetBlob(url).catch((error: unknown) => {
    // 실패를 캐시에 남기면 재시도가 막히므로 즉시 비운다.
    cache.delete(url)
    throw error
  })
  cache.set(url, request)
  if (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  return request
}

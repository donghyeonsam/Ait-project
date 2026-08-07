import type { ImgHTMLAttributes } from 'react'
import { useEffect, useState } from 'react'
import { isBackendAssetUrl } from '@/api/http'
import { fetchAssetBlobCached } from '@/lib/asset-blob-cache'
import { useInView } from '@/lib/useInView'

interface AuthenticatedImageState {
  originalSource: string
  objectUrl?: string
  hasError: boolean
}

function useAuthenticatedImageUrl(source: string, enabled: boolean) {
  const requiresAuthentication = isBackendAssetUrl(source)
  const [state, setState] = useState<AuthenticatedImageState | null>(null)

  useEffect(() => {
    if (!enabled || !isBackendAssetUrl(source)) return

    let active = true
    let objectUrl: string | null = null

    // 캐시된 blob이면 네트워크 없이 즉시 해소돼 탭 전환·재렌더 시 재다운로드가 없다.
    void fetchAssetBlobCached(source)
      .then((blob) => {
        const nextObjectUrl = URL.createObjectURL(blob)
        if (!active) {
          URL.revokeObjectURL(nextObjectUrl)
          return
        }
        objectUrl = nextObjectUrl
        setState({
          originalSource: source,
          objectUrl: nextObjectUrl,
          hasError: false,
        })
      })
      .catch(() => {
        if (active) {
          setState({ originalSource: source, hasError: true })
        }
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [source, enabled])

  if (!requiresAuthentication) {
    return { source, isLoading: false, hasError: false }
  }

  const sourceState = state?.originalSource === source ? state : null
  return {
    source: sourceState?.objectUrl,
    isLoading: !sourceState,
    hasError: sourceState?.hasError ?? false,
  }
}

interface AuthenticatedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string
  // 인증 fetch는 loading="lazy"와 무관하게 마운트 즉시 나가므로, 긴 목록은 lazy로 뷰포트 진입까지 미룬다.
  lazy?: boolean
}

// 보호된 BE 이미지는 인증 fetch로 Blob URL을 만든 뒤 표시하고, 일반 이미지는 원래 URL을 사용한다.
export function AuthenticatedImage({
  src,
  lazy = false,
  ...props
}: AuthenticatedImageProps) {
  // 스크롤 도착 직전에 받아두도록 뷰포트보다 한 화면 앞서 관찰한다.
  const { ref, isInView } = useInView<HTMLImageElement>({
    threshold: 0,
    rootMargin: '100% 0px',
  })
  const image = useAuthenticatedImageUrl(src, !lazy || isInView)

  return (
    <img
      {...props}
      ref={lazy ? ref : undefined}
      src={image.source}
      aria-busy={image.isLoading || undefined}
      data-image-load-error={image.hasError || undefined}
    />
  )
}

import type { ImgHTMLAttributes } from 'react'
import { useEffect, useState } from 'react'
import { isBackendAssetUrl } from '@/api/http'
import { fetchAssetBlobCached } from '@/lib/asset-blob-cache'

interface AuthenticatedImageState {
  originalSource: string
  objectUrl?: string
  hasError: boolean
}

function useAuthenticatedImageUrl(source: string) {
  const requiresAuthentication = isBackendAssetUrl(source)
  const [state, setState] = useState<AuthenticatedImageState | null>(null)

  useEffect(() => {
    if (!isBackendAssetUrl(source)) return

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
  }, [source])

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
}

// 보호된 BE 이미지는 인증 fetch로 Blob URL을 만든 뒤 표시하고, 일반 이미지는 원래 URL을 사용한다.
export function AuthenticatedImage({
  src,
  ...props
}: AuthenticatedImageProps) {
  const image = useAuthenticatedImageUrl(src)

  return (
    <img
      {...props}
      src={image.source}
      aria-busy={image.isLoading || undefined}
      data-image-load-error={image.hasError || undefined}
    />
  )
}

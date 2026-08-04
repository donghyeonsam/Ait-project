import { useEffect, useMemo, useState } from 'react'
import {
  fetchBackendAssetBlob,
  isBackendAssetUrl,
} from '@/api/http'

const AUTHENTICATED_SOURCE_ATTRIBUTE = 'data-authenticated-image-src'

const prepareHtml = (html: string) => {
  const document = new DOMParser().parseFromString(html, 'text/html')
  document.querySelectorAll('img').forEach((image) => {
    const source = image.getAttribute('src') ?? ''
    if (!isBackendAssetUrl(source)) return
    image.setAttribute(AUTHENTICATED_SOURCE_ATTRIBUTE, source)
    image.setAttribute('aria-busy', 'true')
    image.removeAttribute('src')
  })
  return document.body.innerHTML
}

interface ResolvedHtml {
  // 어떤 준비 HTML을 해석한 결과인지 함께 담아, 본문이 바뀌면 이전 결과를 쓰지 않는다.
  preparedHtml: string
  html: string
}

interface AuthenticatedHtmlProps {
  html: string
  className?: string
}

// sanitize된 본문 안의 보호 이미지에 인증 Blob URL을 주입한다.
// DOM에 직접 src를 꽂으면 부모 리렌더 시 dangerouslySetInnerHTML이 다시 적용되며 지워지므로,
// Blob URL을 반영한 HTML 문자열을 만들어 렌더링한다.
export function AuthenticatedHtml({
  html,
  className,
}: AuthenticatedHtmlProps) {
  const preparedHtml = useMemo(() => prepareHtml(html), [html])
  const [resolvedHtml, setResolvedHtml] = useState<ResolvedHtml | null>(null)

  useEffect(() => {
    const document = new DOMParser().parseFromString(preparedHtml, 'text/html')
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        `img[${AUTHENTICATED_SOURCE_ATTRIBUTE}]`,
      ),
    )
    if (images.length === 0) return

    let active = true
    const objectUrls: string[] = []

    void Promise.all(
      images.map(async (image) => {
        const source = image.getAttribute(AUTHENTICATED_SOURCE_ATTRIBUTE)
        if (!source) return
        try {
          const blob = await fetchBackendAssetBlob(source)
          const objectUrl = URL.createObjectURL(blob)
          if (!active) {
            URL.revokeObjectURL(objectUrl)
            return
          }
          objectUrls.push(objectUrl)
          image.setAttribute('src', objectUrl)
        } catch {
          image.setAttribute('data-image-load-error', 'true')
        } finally {
          image.removeAttribute('aria-busy')
        }
      }),
    ).then(() => {
      if (!active) return
      setResolvedHtml({ preparedHtml, html: document.body.innerHTML })
    })

    return () => {
      active = false
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
    }
  }, [preparedHtml])

  const displayHtml =
    resolvedHtml?.preparedHtml === preparedHtml
      ? resolvedHtml.html
      : preparedHtml

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  )
}

import { useEffect, useMemo, useRef } from 'react'
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
    image.removeAttribute('src')
  })
  return document.body.innerHTML
}

interface AuthenticatedHtmlProps {
  html: string
  className?: string
}

// sanitize된 본문 안의 보호 이미지에만 인증 Blob URL을 주입한다.
export function AuthenticatedHtml({
  html,
  className,
}: AuthenticatedHtmlProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const preparedHtml = useMemo(() => prepareHtml(html), [html])

  useEffect(() => {
    const images = Array.from(
      rootRef.current?.querySelectorAll<HTMLImageElement>(
        `img[${AUTHENTICATED_SOURCE_ATTRIBUTE}]`,
      ) ?? [],
    )
    let active = true
    const objectUrls: string[] = []

    images.forEach((image) => {
      const source = image.getAttribute(AUTHENTICATED_SOURCE_ATTRIBUTE)
      if (!source) return
      image.setAttribute('aria-busy', 'true')

      void fetchBackendAssetBlob(source)
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob)
          if (!active) {
            URL.revokeObjectURL(objectUrl)
            return
          }
          objectUrls.push(objectUrl)
          image.src = objectUrl
          image.removeAttribute('aria-busy')
        })
        .catch(() => {
          if (!active) return
          image.removeAttribute('aria-busy')
          image.setAttribute('data-image-load-error', 'true')
        })
    })

    return () => {
      active = false
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
    }
  }, [preparedHtml])

  return (
    <div
      ref={rootRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: preparedHtml }}
    />
  )
}

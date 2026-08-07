import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useEffect } from 'react'
import { isBackendAssetUrl } from '@/api/http'
import { AuthenticatedImage } from '@/components/common/AuthenticatedImage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { fetchAssetBlobCached } from '@/lib/asset-blob-cache'
import { formatPostDate } from '@/lib/format'
import type { StudyMaterialItem } from '@/types/study-materials'

interface StudyMaterialImageViewerDialogProps {
  images: StudyMaterialItem[]
  // 열려 있는 이미지의 배열 인덱스. null이면 닫힌 상태다.
  activeIndex: number | null
  onActiveIndexChange: (index: number) => void
  onClose: () => void
  onDownload: (image: StudyMaterialItem) => void
}

// 자료실 이미지를 원본 비율로 크게 보여주고 이전·다음 탐색과 다운로드를 제공하는 뷰어.
export function StudyMaterialImageViewerDialog({
  images,
  activeIndex,
  onActiveIndexChange,
  onClose,
  onDownload,
}: StudyMaterialImageViewerDialogProps) {
  // 이전·다음으로 넘길 때 로딩이 보이지 않도록 인접 이미지를 캐시에 미리 받아둔다.
  useEffect(() => {
    if (activeIndex === null) return
    for (const adjacent of [images[activeIndex - 1], images[activeIndex + 1]]) {
      if (adjacent && isBackendAssetUrl(adjacent.url)) {
        fetchAssetBlobCached(adjacent.url).catch(() => {})
      }
    }
  }, [activeIndex, images])

  const image = activeIndex === null ? null : images[activeIndex]
  if (activeIndex === null || !image) return null

  const hasPrevious = activeIndex > 0
  const hasNext = activeIndex < images.length - 1

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="w-[min(56rem,calc(100vw-2rem))] overflow-hidden p-0"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' && hasPrevious) {
            onActiveIndexChange(activeIndex - 1)
          }
          if (event.key === 'ArrowRight' && hasNext) {
            onActiveIndexChange(activeIndex + 1)
          }
        }}
      >
        <DialogTitle className="sr-only">
          이미지 미리보기: {image.originalFilename}
        </DialogTitle>

        {/* 인증 이미지를 불러오는 동안에도 뷰어 높이가 유지되도록 최소 높이를 준다. */}
        <div className="relative flex min-h-64 items-center justify-center bg-status-neutral-surface">
          <AuthenticatedImage
            src={image.url}
            alt={image.originalFilename}
            className="mx-auto max-h-[65vh] w-auto max-w-full object-contain"
          />
          {hasPrevious ? (
            <button
              type="button"
              onClick={() => onActiveIndexChange(activeIndex - 1)}
              className="absolute left-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-ait-pill border border-border-default bg-surface-default text-action-primary shadow-elevation-1 transition-shadow [transition-duration:var(--duration-fast)] hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-action-primary/25"
              aria-label="이전 이미지"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          ) : null}
          {hasNext ? (
            <button
              type="button"
              onClick={() => onActiveIndexChange(activeIndex + 1)}
              className="absolute right-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-ait-pill border border-border-default bg-surface-default text-action-primary shadow-elevation-1 transition-shadow [transition-duration:var(--duration-fast)] hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-action-primary/25"
              aria-label="다음 이미지"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default p-4">
          <div className="min-w-0">
            <p className="truncate text-body-1 font-semibold text-text-primary">
              {image.originalFilename}
            </p>
            <p className="mt-1 text-caption text-text-secondary">
              {image.uploaderNickname} · {formatPostDate(image.createdAt)} ·{' '}
              {activeIndex + 1} / {images.length}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onDownload(image)}
          >
            <Download aria-hidden="true" />
            다운로드
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

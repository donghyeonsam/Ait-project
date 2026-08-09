import { Copy, Download, Paperclip } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AuthenticatedImage } from '@/components/common/AuthenticatedImage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  copyImageToClipboard,
  downloadAttachment,
} from '@/lib/attachment-actions'
import { formatPostDate } from '@/lib/format'
import type { StudyChatFileAttachment } from '@/lib/study-chat-file'

// 실수로 원치 않는 파일이 저장되지 않도록 모든 첨부 다운로드는 확인 모달을 거친다.
function useConfirmedDownload(file: StudyChatFileAttachment) {
  const [isConfirmOpen, setConfirmOpen] = useState(false)
  const [isDownloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openConfirm = () => {
    setError(null)
    setConfirmOpen(true)
  }

  const confirm = async () => {
    if (isDownloading) return
    setDownloading(true)
    setError(null)
    try {
      await downloadAttachment(file.url, file.originalFilename)
      setConfirmOpen(false)
    } catch {
      setError('다운로드하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setDownloading(false)
    }
  }

  return { isConfirmOpen, setConfirmOpen, isDownloading, error, openConfirm, confirm }
}

interface DownloadConfirmDialogProps {
  title: string
  filename: string
  download: ReturnType<typeof useConfirmedDownload>
}

function DownloadConfirmDialog({
  title,
  filename,
  download,
}: DownloadConfirmDialogProps) {
  return (
    <Dialog open={download.isConfirmOpen} onOpenChange={download.setConfirmOpen}>
      <DialogContent className="w-[min(90vw,24rem)] p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="break-all">
            {filename} 파일을 내 기기에 저장해요.
          </DialogDescription>
        </DialogHeader>
        {download.error ? (
          <p className="mt-3 text-caption text-status-error" role="alert">
            {download.error}
          </p>
        ) : null}
        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => download.setConfirmOpen(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={() => void download.confirm()}
            disabled={download.isDownloading}
            aria-busy={download.isDownloading}
          >
            {download.isDownloading ? '다운로드 중' : '다운로드'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface MenuPosition {
  x: number
  y: number
}

interface ImageContextMenuProps {
  position: MenuPosition
  filename: string
  onClose: () => void
  onDownload: () => void
  onCopy: () => void
}

// 커서 위치에 뜨는 이미지 전용 컨텍스트 메뉴. 다이얼로그·스크롤 컨테이너에 가리지 않도록 body에 포탈한다.
function ImageContextMenu({
  position,
  filename,
  onClose,
  onDownload,
  onCopy,
}: ImageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const handleClose = () => onClose()
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [onClose])

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    )
    const currentIndex = items.findIndex(
      (item) => item === document.activeElement,
    )
    const nextIndex =
      event.key === 'ArrowDown'
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length
    items[nextIndex]?.focus()
  }

  // 메뉴가 화면 밖으로 잘리지 않도록 뷰포트 가장자리에서 안쪽으로 밀어 넣는다.
  const left = Math.max(8, Math.min(position.x, window.innerWidth - 168))
  const top = Math.max(8, Math.min(position.y, window.innerHeight - 100))

  const itemClasses =
    'flex w-full items-center gap-2 rounded-ait-s px-3 py-2 text-left text-caption font-medium text-action-primary transition-colors hover:bg-status-neutral-surface focus-visible:outline-none focus-visible:bg-status-neutral-surface'

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={`${filename} 이미지 메뉴`}
      style={{ left, top }}
      onKeyDown={handleMenuKeyDown}
      className="fixed z-(--z-index-dropdown) w-40 rounded-ait-s border border-border-default bg-surface-default p-1 shadow-elevation-2"
    >
      <button type="button" role="menuitem" onClick={onDownload} className={itemClasses}>
        <Download className="size-4" aria-hidden="true" />
        다운로드
      </button>
      <button type="button" role="menuitem" onClick={onCopy} className={itemClasses}>
        <Copy className="size-4" aria-hidden="true" />
        복사
      </button>
    </div>,
    document.body,
  )
}

interface StudyChatImageMessageProps {
  file: StudyChatFileAttachment
  senderNickname: string
  createdAt: string
}

// 그룹톡 이미지 첨부. 좌클릭은 자료실과 같은 확대 뷰어, 우클릭은 다운로드·복사 메뉴를 연다.
export function StudyChatImageMessage({
  file,
  senderNickname,
  createdAt,
}: StudyChatImageMessageProps) {
  const [isViewerOpen, setViewerOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const download = useConfirmedDownload(file)

  useEffect(() => {
    if (!copyFeedback) return
    const timer = window.setTimeout(() => setCopyFeedback(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copyFeedback])

  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault()
    setMenuPosition({ x: event.clientX, y: event.clientY })
  }

  const handleCopy = async () => {
    setMenuPosition(null)
    try {
      await copyImageToClipboard(file.url)
      setCopyFeedback('이미지를 복사했어요.')
    } catch {
      setCopyFeedback('이미지를 복사하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        onContextMenu={handleContextMenu}
        aria-label={`${file.originalFilename} 크게 보기`}
        aria-haspopup="dialog"
        className="block cursor-zoom-in focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
      >
        <AuthenticatedImage
          src={file.url}
          alt={file.originalFilename}
          lazy
          className="block max-h-48 max-w-full rounded-ait-s object-contain"
        />
      </button>

      {menuPosition ? (
        <ImageContextMenu
          position={menuPosition}
          filename={file.originalFilename}
          onClose={() => setMenuPosition(null)}
          onDownload={() => {
            setMenuPosition(null)
            download.openConfirm()
          }}
          onCopy={() => void handleCopy()}
        />
      ) : null}

      <Dialog
        open={isViewerOpen}
        onOpenChange={(open) => {
          if (!open) setViewerOpen(false)
        }}
      >
        <DialogContent className="w-[min(56rem,calc(100vw-2rem))] overflow-hidden p-0">
          <DialogTitle className="sr-only">
            이미지 미리보기: {file.originalFilename}
          </DialogTitle>

          <div className="relative flex min-h-64 items-center justify-center bg-status-neutral-surface">
            <AuthenticatedImage
              src={file.url}
              alt={file.originalFilename}
              className="mx-auto max-h-[65vh] w-auto max-w-full object-contain"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default p-4">
            <div className="min-w-0">
              <p className="truncate text-body-1 font-semibold text-text-primary">
                {file.originalFilename}
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                {senderNickname} · {formatPostDate(createdAt)}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={download.openConfirm}>
              <Download aria-hidden="true" />
              다운로드
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DownloadConfirmDialog
        title="이미지를 다운로드할까요?"
        filename={file.originalFilename}
        download={download}
      />

      {copyFeedback
        ? createPortal(
            <p
              role="status"
              className="fixed bottom-6 right-6 z-[var(--z-index-toast)] rounded-ait-s bg-navy-900 px-4 py-3 text-body-2 text-surface-default shadow-elevation-2"
            >
              {copyFeedback}
            </p>,
            document.body,
          )
        : null}
    </>
  )
}

interface StudyChatFileMessageProps {
  file: StudyChatFileAttachment
}

// 그룹톡 일반 파일 첨부. 클릭하면 바로 저장하지 않고 다운로드 확인 모달을 먼저 연다.
export function StudyChatFileMessage({ file }: StudyChatFileMessageProps) {
  const download = useConfirmedDownload(file)

  return (
    <>
      <button
        type="button"
        onClick={download.openConfirm}
        className="flex w-full items-center gap-1.5 py-0.5 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
      >
        <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate underline underline-offset-2">
          {file.originalFilename}
        </span>
      </button>

      <DownloadConfirmDialog
        title="파일을 다운로드할까요?"
        filename={file.originalFilename}
        download={download}
      />
    </>
  )
}

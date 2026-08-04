import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** 설명 아래에 추가로 넣을 입력 폼 등. 단순 확인 문구로 부족할 때만 사용한다. */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'destructive'
  isConfirming?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
}

// 되돌리기 어려운 행동 전에 한 번 더 확인하는 공통 모달.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirmVariant = 'primary',
  isConfirming = false,
  confirmDisabled = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(26rem,calc(100vw-2rem))] p-8"
      >
        <DialogHeader>
          <DialogTitle className="[font-size:var(--text-h3)]">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children ? <div className="mt-4">{children}</div> : null}
        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="secondary"
            disabled={isConfirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={isConfirming || confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

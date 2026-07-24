import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
  onSaveAndContinue: () => void
  isSaving: boolean
}

// 저장하지 않은 변경사항이 있는 상태에서 페이지를 벗어나려 할 때 선택지를 제공한다.
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  onSaveAndContinue,
  isSaving,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(90vw,26rem)] p-6">
        <DialogHeader>
          <DialogTitle>저장하지 않은 변경사항이 있습니다</DialogTitle>
          <DialogDescription>
            지금 이동하면 변경한 내용이 사라집니다. 어떻게 할까요?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" variant="text" onClick={onDiscard}>
            저장하지 않고 이동
          </Button>
          <Button
            type="button"
            onClick={onSaveAndContinue}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? '저장 중' : '저장하고 이동'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

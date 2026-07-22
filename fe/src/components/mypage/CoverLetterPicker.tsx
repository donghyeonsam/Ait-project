import { FilePenLine } from 'lucide-react'
import { LineSidebar } from '@/components/reactbits/LineSidebar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CoverLetterPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: string[]
  onSelect: (index: number) => void
}

export function CoverLetterPicker({
  open,
  onOpenChange,
  items,
  onSelect,
}: CoverLetterPickerProps) {
  const selectItem = (index: number) => {
    onSelect(index)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="cover-letter-picker-dialog rounded-none p-0"
        overlayClassName="cover-letter-picker-overlay"
      >
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-border-default px-7 py-7 pr-16">
            <span className="mb-2 inline-flex size-10 items-center justify-center rounded-ait-s bg-action-primary text-surface-default">
              <FilePenLine aria-hidden="true" />
            </span>
            <DialogTitle>자기소개서 목록</DialogTitle>
            <DialogDescription>
              작성하거나 수정할 자기소개서를 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
            <p className="mb-5 text-caption text-text-secondary">
              저장된 자기소개서 {items.length}개
            </p>
            <LineSidebar
              items={items}
              accentColor="var(--color-action-primary)"
              textColor="var(--color-text-secondary)"
              markerColor="var(--color-border-default)"
              showIndex
              showMarker
              proximityRadius={100}
              maxShift={30}
              falloff="smooth"
              markerLength={60}
              markerGap={0}
              tickScale={0.5}
              scaleTick
              itemGap={20}
              fontSize={1.1}
              smoothing={100}
              defaultActive={0}
              ariaLabel="저장된 자기소개서"
              onItemClick={selectItem}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

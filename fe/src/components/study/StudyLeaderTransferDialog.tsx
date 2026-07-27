import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { StudyGroupMember } from '@/mocks/study-lounge'

interface StudyLeaderTransferDialogProps {
  open: boolean
  candidates: StudyGroupMember[]
  onOpenChange: (open: boolean) => void
  onTransfer: (memberId: number) => void
}

// 새 그룹장 후보를 선택하고 권한 위임 의사를 확인한다.
export function StudyLeaderTransferDialog({
  open,
  candidates,
  onOpenChange,
  onTransfer,
}: StudyLeaderTransferDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const selectedMember = candidates.find(
    (member) => member.id === selectedMemberId,
  )

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) setSelectedMemberId(null)
    onOpenChange(nextOpen)
  }

  const transferLeadership = () => {
    if (!selectedMember) return
    onTransfer(selectedMember.id)
    changeOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        className="w-[min(30rem,calc(100vw-2rem))] border border-border-default p-6"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>그룹장을 위임할까요?</DialogTitle>
          <DialogDescription>
            새 그룹장을 선택해 주세요. 위임하면 관리자 권한이 바로
            이전됩니다.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="mt-6">
          <legend className="text-body-2 font-semibold text-text-primary">
            새 그룹장
          </legend>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {candidates.length > 0 ? (
              candidates.map((member) => {
                const isSelected = member.id === selectedMemberId
                return (
                  <label
                    key={member.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-ait-m border p-3 transition-[background-color,border-color,box-shadow] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]',
                      isSelected
                        ? 'border-action-primary bg-status-info-surface shadow-elevation-1'
                        : 'border-border-default hover:bg-status-neutral-surface',
                    )}
                  >
                    <input
                      type="radio"
                      name="next-study-leader"
                      value={member.id}
                      checked={isSelected}
                      onChange={() => setSelectedMemberId(member.id)}
                      className="size-4 shrink-0 accent-action-primary"
                    />
                    <Avatar className="size-10">
                      <AvatarFallback className="border-0 bg-profile-avatar text-body-2 font-semibold text-action-primary">
                        {member.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-body-2 font-semibold text-text-primary">
                        {member.name}
                      </span>
                      <span className="block truncate text-caption text-text-secondary">
                        {member.role}
                      </span>
                    </span>
                  </label>
                )
              })
            ) : (
              <p className="rounded-ait-m border border-border-default bg-status-neutral-surface p-4 text-body-2 text-text-secondary">
                위임할 수 있는 멤버가 없습니다.
              </p>
            )}
          </div>
        </fieldset>

        <p
          className="mt-4 min-h-5 text-body-2 text-text-secondary"
          aria-live="polite"
        >
          {selectedMember
            ? `${selectedMember.name} 님에게 그룹장 권한을 위임합니다.`
            : candidates.length > 0
              ? '위임할 멤버를 선택해 주세요.'
              : '새 멤버가 가입한 뒤 다시 시도해 주세요.'}
        </p>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => changeOpen(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={!selectedMember}
            onClick={transferLeadership}
          >
            그룹장 위임
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

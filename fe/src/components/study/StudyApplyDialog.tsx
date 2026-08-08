import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { StudyCardData } from '@/components/study/StudyCard'

interface StudyApplyDialogProps {
  study: StudyCardData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (message: string) => void
}

// 스터디 신청 전에 그룹장에게 전달할 지원 메시지를 작성한다.
export function StudyApplyDialog({
  study,
  open,
  onOpenChange,
  onSubmit,
}: StudyApplyDialogProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return
    setMessage('')
    onSubmit(trimmedMessage)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setMessage('')
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(38rem,calc(100vw-2rem))] border border-border-default p-6">
        <DialogHeader className="pr-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle>스터디 신청</DialogTitle>
            <p className="text-body-2 font-medium text-action-primary">
              {study?.title}
            </p>
          </div>
          <DialogDescription>
            그룹장이 확인할 수 있도록 참여 가능 일정과 준비 중인 직무를 알려주세요.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-body-2 font-medium text-text-primary">
              신청 메시지
            </span>
            <Textarea
              autoFocus
              value={message}
              maxLength={500}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="지원 직무, 스터디 참여 목적과 가능한 일정을 작성해 주세요."
              className="min-h-36"
              required
            />
          </label>
          <p className="mt-2 text-right text-caption text-text-secondary">
            {message.length}/500
          </p>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!message.trim()}>
              신청 보내기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createStudyGroup } from '@/api/study-groups'
import { toErrorMessage } from '@/api/http'

interface StudyCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (groupId: number) => void
}

// 스터디 그룹 생성 Dialog. 생성 API 스펙이 제목·소개만 받으므로 그 두 가지만 입력받는다.
export function StudyCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: StudyCreateDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !description.trim() || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const groupId = await createStudyGroup({
        title: title.trim(),
        description: description.trim(),
      })
      setTitle('')
      setDescription('')
      onOpenChange(false)
      onCreated(groupId)
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))] border border-border-default p-6">
        <DialogHeader>
          <DialogTitle>스터디 만들기</DialogTitle>
          <DialogDescription>
            함께 준비할 스터디의 기본 정보를 입력해 주세요.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-body-2 font-medium text-text-primary">
              스터디명
            </span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 금융권 면접 PT 대비"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-body-2 font-medium text-text-primary">
              소개
            </span>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="모임 일정과 준비할 내용을 알려주세요."
              required
            />
          </label>

          {errorMessage ? (
            <p className="text-caption text-status-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '만드는 중...' : '스터디 만들기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

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

interface StudyCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

// 별도 생성 화면이 연결되기 전 라운지에서 생성 입력 흐름을 확인하는 목 Dialog다.
export function StudyCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: StudyCreateDialogProps) {
  const [title, setTitle] = useState('')
  const [role, setRole] = useState('프론트엔드')
  const [description, setDescription] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !description.trim()) return

    // TODO: 실제 API 연동 필요 — 생성 API 성공 후 라운지 목록을 갱신한다.
    setTitle('')
    setRole('프론트엔드')
    setDescription('')
    onOpenChange(false)
    onCreated()
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
              직무
            </span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-10 w-full rounded-ait-s border border-input bg-surface-default px-3 text-body-2 text-text-primary shadow-elevation-1 focus:border-action-primary"
            >
              <option>프론트엔드</option>
              <option>백엔드</option>
              <option>AI</option>
              <option>PT면접</option>
              <option>인성면접</option>
            </select>
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

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit">스터디 만들기</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { StudyGroupMember } from '@/mocks/study-lounge'

interface StudyGroupMemberPanelProps {
  members: StudyGroupMember[]
  capacity: number
  canManage: boolean
  onRemoveMember: (memberId: number) => void
  onInviteMember: (nickname: string) => void
}

// 그룹 구성원 목록과 그룹장 전용 초대·내보내기 행동을 제공한다.
export function StudyGroupMemberPanel({
  members,
  capacity,
  canManage,
  onRemoveMember,
  onInviteMember,
}: StudyGroupMemberPanelProps) {
  const [isInviting, setIsInviting] = useState(false)
  const [nickname, setNickname] = useState('')

  const handleInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedNickname = nickname.trim()
    if (!trimmedNickname) return
    onInviteMember(trimmedNickname)
    setNickname('')
    setIsInviting(false)
  }

  return (
    <section className="min-w-0 rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1">
      <h2 className="text-body-1 font-semibold text-text-primary">
        구성원 {members.length} / {capacity}
      </h2>

      <ul className="mt-3 space-y-1">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex min-h-12 items-center gap-3 rounded-ait-s px-3 py-2 hover:bg-status-neutral-surface"
          >
            <Avatar className="size-10">
              <AvatarFallback className="border-0 bg-profile-avatar text-transparent">
                그룹원
              </AvatarFallback>
            </Avatar>
            <p className="min-w-0 flex-1 truncate text-body-2 text-text-primary">
              <span className="font-medium">{member.name}</span>
              <span className="text-text-secondary"> · {member.role}</span>
            </p>
            {canManage && !member.isSelf ? (
              <button
                type="button"
                onClick={() => onRemoveMember(member.id)}
                className="shrink-0 rounded-ait-s border border-status-error-border px-3 py-1 text-caption text-status-error hover:bg-status-error-surface"
                aria-label={`${member.name} 내보내기`}
              >
                내보내기
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {canManage && members.length < capacity ? (
        isInviting ? (
          <form className="mt-3 flex gap-2" onSubmit={handleInvite}>
            <label className="min-w-0 flex-1">
              <span className="sr-only">초대할 닉네임</span>
              <Input
                autoFocus
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="닉네임 입력"
              />
            </label>
            <Button type="submit" variant="secondary">
              초대
            </Button>
            <Button
              type="button"
              variant="text"
              onClick={() => setIsInviting(false)}
            >
              취소
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsInviting(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-ait-s border border-dashed border-text-secondary px-4 py-3 text-body-2 text-action-primary hover:bg-status-neutral-surface"
          >
            <Plus className="size-4" aria-hidden="true" />
            닉네임으로 초대하기
          </button>
        )
      ) : null}
    </section>
  )
}

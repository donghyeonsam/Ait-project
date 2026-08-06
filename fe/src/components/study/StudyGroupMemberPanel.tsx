import { Crown } from 'lucide-react'
import type { CSSProperties } from 'react'
import { ProfileAvatar } from '@/components/common/ProfileAvatar'
import { cn } from '@/lib/utils'

/** 구성원 패널이 그리는 최소 정보. 그룹 상세 응답의 members를 이 형태로 변환해 넘긴다. */
export interface StudyGroupMember {
  id: number
  nickname: string
  role: string
  isSelf: boolean
  profileImageUrl: string | null
}

interface StudyGroupMemberPanelProps {
  members: StudyGroupMember[]
  capacity: number
  canManage: boolean
  onRemoveMember: (memberId: number) => void
}

// 그룹 구성원 목록과 그룹장 전용 내보내기 행동을 제공한다.
export function StudyGroupMemberPanel({
  members,
  capacity,
  canManage,
  onRemoveMember,
}: StudyGroupMemberPanelProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1">
      <h2 className="shrink-0 text-body-1 font-semibold text-text-primary">
        구성원 {members.length} / {capacity}
      </h2>

      <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        {members.map((member, index) => (
          <li
            key={member.id}
            style={{ '--item-order': index } as CSSProperties}
            className={cn(
              'study-list-item flex min-h-12 items-center gap-3 rounded-ait-s px-3 py-2',
              'hover:bg-status-neutral-surface hover:shadow-elevation-1',
            )}
          >
            <ProfileAvatar
              src={member.profileImageUrl}
              fallbackLabel={member.nickname.slice(0, 1)}
              className="size-10"
            />
            <p className="flex min-w-0 flex-1 items-center gap-1.5 text-body-2 text-text-primary">
              <span className="truncate font-medium">{member.nickname}</span>
              {member.role === '그룹장' ? (
                <Crown
                  className="size-4 shrink-0 text-status-warning"
                  role="img"
                  aria-label="그룹장"
                />
              ) : null}
            </p>
            {canManage && !member.isSelf ? (
              <button
                type="button"
                onClick={() => onRemoveMember(member.id)}
                className="shrink-0 rounded-ait-s border border-status-error-border px-3 py-1 text-caption text-status-error hover:bg-status-error-surface"
                aria-label={`${member.nickname} 내보내기`}
              >
                내보내기
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

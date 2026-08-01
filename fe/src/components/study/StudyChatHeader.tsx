import { ChevronDown, UserRoundPlus, UsersRound, X } from 'lucide-react'
import type {
  MyStudyGroup,
  StudyGroupMemberInfo,
} from '@/api/study-groups'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { DialogClose } from '@/components/ui/dialog'

interface StudyChatHeaderProps {
  group: MyStudyGroup | null
  members: StudyGroupMemberInfo[]
  isLoadingGroup: boolean
  isConnected: boolean
  isGroupSwitcherOpen: boolean
  isMemberListOpen: boolean
  groupSwitcherId: string
  groupTriggerRef: React.RefObject<HTMLButtonElement | null>
  onToggleGroupSwitcher: () => void
  onToggleMemberList: () => void
}

// 현재 그룹과 연결 상태를 요약하고 그룹 전환·멤버·닫기 동작을 제공한다.
export function StudyChatHeader({
  group,
  members,
  isLoadingGroup,
  isConnected,
  isGroupSwitcherOpen,
  isMemberListOpen,
  groupSwitcherId,
  groupTriggerRef,
  onToggleGroupSwitcher,
  onToggleMemberList,
}: StudyChatHeaderProps) {
  return (
    <header className="relative flex h-[5.25rem] shrink-0 items-center justify-between gap-3 border-b border-border-default px-4 sm:px-6">
      <button
        ref={groupTriggerRef}
        type="button"
        onClick={() => {
          if (group) onToggleGroupSwitcher()
        }}
        aria-disabled={!group}
        aria-expanded={isGroupSwitcherOpen}
        aria-controls={groupSwitcherId}
        className="group flex min-w-0 items-center gap-3 rounded-ait-m p-1.5 text-left transition-colors hover:bg-status-neutral-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25 aria-disabled:cursor-default aria-disabled:hover:bg-transparent"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-ait-pill bg-loading-pastel-violet text-tag-role sm:size-12">
          <UsersRound className="size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-body-1 font-bold text-action-primary">
              {group?.title ?? '그룹톡'}
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-text-secondary transition-transform ${isGroupSwitcherOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-caption text-text-secondary">
            {group ? <span>{group.currentMemberCount}명</span> : null}
            {group ? <span aria-hidden="true">·</span> : null}
            {/* TODO: 실제 API 연동 필요 - 접속 인원 API가 추가되면 연결 상태 대신 접속자 수를 표시한다. */}
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`size-2 rounded-ait-pill ${isConnected ? 'bg-status-success' : 'bg-status-neutral'}`}
                aria-hidden="true"
              />
              {!group
                ? isLoadingGroup
                  ? '그룹 정보를 불러오는 중'
                  : '참여 그룹 없음'
                : isConnected
                  ? '그룹톡 연결됨'
                  : '연결 중'}
            </span>
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleMemberList}
          disabled={!group}
          aria-expanded={isMemberListOpen}
          aria-controls="study-chat-member-list"
          className="inline-flex h-10 items-center gap-2 rounded-ait-s border border-border-default bg-surface-default px-3 text-body-2 font-semibold text-action-primary transition-colors hover:bg-status-neutral-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25 disabled:opacity-50"
        >
          <UserRoundPlus className="size-5" aria-hidden="true" />
          <span className="hidden min-[24rem]:inline">멤버</span>
        </button>
        <DialogClose asChild>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
            aria-label="그룹톡 닫기"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </DialogClose>
      </div>

      {isMemberListOpen ? (
        <div
          id="study-chat-member-list"
          className="study-chat-popover absolute right-14 top-[4.65rem] z-(--z-index-dropdown) w-[min(18rem,calc(100vw-2rem))] rounded-ait-l border border-border-default bg-surface-default p-2 shadow-elevation-3"
        >
          <p className="px-3 pb-2 pt-2 text-body-2 font-semibold text-action-primary">
            그룹 멤버 <span className="text-text-secondary">{members.length}</span>
          </p>
          <div className="max-h-72 overflow-y-auto">
            {members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 rounded-ait-s px-3 py-2"
                >
                  <Avatar className="size-9 border border-border-default bg-profile-avatar">
                    {member.profileImageUrl ? (
                      <AvatarImage
                        src={member.profileImageUrl}
                        alt=""
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="border-0 bg-profile-avatar text-caption font-semibold text-action-primary">
                      {member.name.trim().charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-body-2 text-text-primary">
                    {member.name}
                  </span>
                  {member.owner ? (
                    <span className="rounded-ait-pill bg-status-neutral-surface px-2 py-0.5 text-caption text-text-secondary">
                      방장
                    </span>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="px-3 py-5 text-center text-caption text-text-secondary">
                멤버 정보를 불러오는 중입니다.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}

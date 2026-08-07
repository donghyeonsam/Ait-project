import { useEffect, useState } from 'react'
import { toErrorMessage } from '@/api/http'
import {
  allowStudyGroupRejoin,
  getStudyGroupKickedMembers,
  type StudyGroupKickedMember,
} from '@/api/study-groups'
import { ProfileAvatar } from '@/components/common/ProfileAvatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPostDate } from '@/lib/format'

interface StudyKickedMemberModalProps {
  groupId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 그룹장이 추방된 멤버 목록을 확인하고 개별로 재가입을 허용한다.
// 열릴 때만 본문을 마운트해 다시 열 때마다 목록·안내 상태가 초기화되게 한다.
export function StudyKickedMemberModal({
  groupId,
  open,
  onOpenChange,
}: StudyKickedMemberModalProps) {
  if (!open) return null
  return (
    <StudyKickedMemberModalContent groupId={groupId} onOpenChange={onOpenChange} />
  )
}

interface StudyKickedMemberModalContentProps {
  groupId: number
  onOpenChange: (open: boolean) => void
}

function StudyKickedMemberModalContent({
  groupId,
  onOpenChange,
}: StudyKickedMemberModalContentProps) {
  const [kickedMembers, setKickedMembers] = useState<StudyGroupKickedMember[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // 허용 확인 다이얼로그에 띄울 대상. null이면 닫힌 상태다.
  const [memberToAllow, setMemberToAllow] =
    useState<StudyGroupKickedMember | null>(null)
  const [isAllowing, setIsAllowing] = useState(false)
  const [allowError, setAllowError] = useState<string | null>(null)
  // 허용을 마친 멤버 안내 문구를 목록 위에 보여준다.
  const [allowedNickname, setAllowedNickname] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    getStudyGroupKickedMembers(groupId)
      .then((members) => {
        if (!isActive) return
        setKickedMembers(members)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setKickedMembers([])
        setLoadError(toErrorMessage(error))
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [groupId])

  const confirmAllowRejoin = async () => {
    if (!memberToAllow) return
    const target = memberToAllow

    setIsAllowing(true)
    setAllowError(null)

    try {
      await allowStudyGroupRejoin(groupId, target.userId)
      setKickedMembers((current) =>
        current.filter((member) => member.userId !== target.userId),
      )
      setAllowedNickname(target.nickname)
      setMemberToAllow(null)
    } catch (error) {
      setAllowError(toErrorMessage(error))
    } finally {
      setIsAllowing(false)
    }
  }

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100svh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto border border-border-default p-4 sm:p-6">
          <DialogHeader className="pr-12">
            <DialogTitle>추방 멤버 관리</DialogTitle>
            <DialogDescription>
              추방된 멤버는 재가입을 허용하기 전까지 가입 신청을 보낼 수
              없어요.
            </DialogDescription>
          </DialogHeader>

          {allowedNickname ? (
            <p
              className="mt-4 rounded-ait-s border border-status-success-border bg-status-success-surface px-3 py-2 text-caption font-medium text-status-success"
              role="status"
            >
              {allowedNickname} 님의 재가입을 허용했어요. 이제 다시 가입 신청을
              보낼 수 있어요.
            </p>
          ) : null}

          {isLoading ? (
            <p className="mt-6 text-body-2 text-text-secondary" role="status">
              추방된 멤버 목록을 불러오고 있어요...
            </p>
          ) : loadError ? (
            <p className="mt-6 text-body-2 text-status-error" role="alert">
              {loadError}
            </p>
          ) : kickedMembers.length === 0 ? (
            <p className="mt-6 text-body-2 text-text-secondary">
              추방된 멤버가 없습니다.
            </p>
          ) : (
            <ul className="mt-6 space-y-2">
              {kickedMembers.map((member) => (
                <li
                  key={member.userId}
                  className="flex min-h-14 items-center gap-3 rounded-ait-m border border-border-default bg-surface-default px-4 py-3"
                >
                  <ProfileAvatar
                    src={member.profileImageUrl}
                    fallbackLabel={member.nickname.slice(0, 1)}
                    className="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-2 font-medium text-text-primary">
                      {member.nickname}
                    </p>
                    {member.kickedAt ? (
                      <p className="mt-0.5 text-caption text-text-secondary">
                        {formatPostDate(member.kickedAt)} 추방
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAllowError(null)
                      setMemberToAllow(member)
                    }}
                    className="shrink-0 rounded-ait-s border border-action-primary px-3 py-1.5 text-caption font-medium text-action-primary transition-colors hover:bg-status-info-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
                  >
                    재가입 허용
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberToAllow !== null}
        onOpenChange={(nextOpen) => {
          if (nextOpen || isAllowing) return
          setMemberToAllow(null)
          setAllowError(null)
        }}
      >
        <DialogContent
          className="w-[min(28rem,calc(100vw-2rem))] border border-border-default p-6"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>
              {memberToAllow?.nickname} 님의 재가입을 허용할까요?
            </DialogTitle>
            <DialogDescription>
              허용하면 추방 기록이 해제되고, 다시 가입 신청을 보낼 수 있어요.
              가입은 신청 검토에서 승인해야 완료됩니다.
            </DialogDescription>
          </DialogHeader>
          {allowError ? (
            <p className="mt-4 text-body-2 text-status-error" role="alert">
              {allowError}
            </p>
          ) : null}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              disabled={isAllowing}
              onClick={() => {
                setMemberToAllow(null)
                setAllowError(null)
              }}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={isAllowing}
              aria-busy={isAllowing}
              onClick={() => void confirmAllowRejoin()}
            >
              {isAllowing ? '허용하는 중' : '재가입 허용'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

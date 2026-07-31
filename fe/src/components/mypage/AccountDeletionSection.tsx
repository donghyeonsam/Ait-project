import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteAccount } from '@/api/auth'
import { toErrorMessage } from '@/api/http'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAuth } from '@/lib/useAuth'

// 프로필 편집 모드에서만 노출되는 계정 삭제 진입점. 확인 대화상자를 거쳐야 탈퇴 요청이 나간다.
export function AccountDeletionSection() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmDelete = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      await deleteAccount()
      signOut()
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(toErrorMessage(requestError))
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="text"
        className="px-1 py-0.5 text-caption font-normal text-text-secondary/60 hover:bg-transparent hover:text-text-secondary"
        onClick={() => {
          setError(null)
          setIsDialogOpen(true)
        }}
      >
        회원 탈퇴
      </Button>
      {error ? (
        <p className="text-caption text-status-error" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setIsDialogOpen(false)
        }}
        title="회원 탈퇴를 진행할까요?"
        description="탈퇴하면 계정과 등록된 이력서·자기소개서·연동 정보가 모두 삭제되며 되돌릴 수 없습니다."
        confirmLabel={isDeleting ? '탈퇴 처리 중...' : '탈퇴하기'}
        cancelLabel="취소"
        confirmVariant="destructive"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

import { useState } from 'react'
import { ApiError, toErrorMessage } from '@/api/http'
import { changeMyPagePassword } from '@/api/my-page'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,20}$/

function validateNewPasswordFormat(value: string) {
  if (!value) return '새 비밀번호를 입력해주세요.'
  if (!passwordPattern.test(value)) {
    return '영문, 숫자, 특수문자를 포함해 8~20자로 입력해주세요.'
  }
  return null
}

type PasswordErrorField = 'old' | 'new' | 'confirm'

// ErrorCode.INVALID_CURRENT_PASSWORD/SAME_AS_CURRENT_PASSWORD/PASSWORD_CONFIRM_NOT_MATCH
// ("USER_002"/"USER_004"/"USER_003")와 매칭. be/global/exception/ErrorCode.java 참고.
const passwordErrorCodeFields: Record<string, PasswordErrorField> = {
  USER_002: 'old',
  USER_004: 'new',
  USER_003: 'confirm',
}

function getPasswordErrorField(error: unknown): PasswordErrorField | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null
  const payload = error.payload as { error?: { code?: string } } | null
  const code = payload?.error?.code
  return code ? (passwordErrorCodeFields[code] ?? null) : null
}

// 프로필 편집 모드에서만 노출되는 비밀번호 변경 진입점. 현재 비밀번호로 본인 확인 후 새 비밀번호로 바꾼다.
export function PasswordChangeSection() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [oldPasswordError, setOldPasswordError] = useState<string | null>(null)
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const closeDialog = () => {
    setIsDialogOpen(false)
    setOldPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setOldPasswordError(null)
    setNewPasswordError(null)
    setConfirmError(null)
    setFormError(null)
  }

  const confirmChange = async () => {
    setOldPasswordError(null)
    setNewPasswordError(null)
    setConfirmError(null)
    setFormError(null)

    if (!oldPassword) {
      setOldPasswordError('현재 비밀번호를 입력해주세요.')
      return
    }
    const formatError = validateNewPasswordFormat(newPassword)
    if (formatError) {
      setNewPasswordError(formatError)
      return
    }
    if (newPassword !== confirmNewPassword) {
      setConfirmError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    setIsChanging(true)
    try {
      await changeMyPagePassword({ oldPassword, newPassword, confirmNewPassword })
      closeDialog()
    } catch (error) {
      const field = getPasswordErrorField(error)
      const message = toErrorMessage(error)
      if (field === 'old') setOldPasswordError(message)
      else if (field === 'new') setNewPasswordError(message)
      else if (field === 'confirm') setConfirmError(message)
      else setFormError(message)
      setIsChanging(false)
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="text"
        className="px-1 py-0.5 text-caption font-normal"
        onClick={() => setIsDialogOpen(true)}
      >
        비밀번호 변경
      </Button>

      <ConfirmDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isChanging) closeDialog()
        }}
        title="비밀번호 변경"
        description="현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요."
        confirmLabel={isChanging ? '변경 중...' : '변경하기'}
        cancelLabel="취소"
        isConfirming={isChanging}
        onConfirm={() => void confirmChange()}
      >
        <div className="space-y-4">
          <PasswordInput
            id="change-password-old"
            label="현재 비밀번호"
            placeholder="현재 비밀번호를 입력하세요"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            error={oldPasswordError ?? undefined}
            disabled={isChanging}
          />
          <PasswordInput
            id="change-password-new"
            label="새 비밀번호"
            placeholder="영문, 숫자, 특수문자 포함 8~20자"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            error={newPasswordError ?? undefined}
            disabled={isChanging}
          />
          <PasswordInput
            id="change-password-confirm"
            label="새 비밀번호 확인"
            placeholder="새 비밀번호를 다시 입력하세요"
            autoComplete="new-password"
            value={confirmNewPassword}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            error={confirmError ?? undefined}
            disabled={isChanging}
          />
          {formError ? (
            <p className="text-caption text-status-error" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  )
}

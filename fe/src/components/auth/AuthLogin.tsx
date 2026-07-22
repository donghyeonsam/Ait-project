import { Link } from 'react-router-dom'
import { AuthModalShell } from '@/components/auth/AuthModalShell'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { Input } from '@/components/ui/input'

interface AuthLoginProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthLogin({ open, onOpenChange }: AuthLoginProps) {
  return (
    <AuthModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="로그인"
      description="Ait에서 오늘의 면접 준비를 이어가세요."
    >
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-4">
          <label className="auth-field-label" htmlFor="login-email">
            <span>이메일</span>
            <Input id="login-email" type="email" autoComplete="email" />
          </label>
          <label className="auth-field-label" htmlFor="login-password">
            <span>비밀번호</span>
            <Input id="login-password" type="password" autoComplete="current-password" />
          </label>
        </div>

        <label className="mt-4 flex cursor-pointer items-center justify-end gap-2 text-body-2 text-text-secondary">
          <input type="checkbox" className="size-4 accent-action-primary" />
          로그인 상태 유지
        </label>

        <SocialAuthButtons />

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-body-2">
          <button type="button" className="rounded-ait-s px-2 py-1 text-text-secondary transition-colors hover:text-action-primary">
            비밀번호를 잊으셨나요?
          </button>
          <Link to="/signup" className="rounded-ait-s px-2 py-1 font-semibold text-action-primary">
            회원가입
          </Link>
        </div>
      </form>
    </AuthModalShell>
  )
}


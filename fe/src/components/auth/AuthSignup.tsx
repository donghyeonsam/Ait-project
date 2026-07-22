import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthModalShell } from '@/components/auth/AuthModalShell'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AuthSignupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type EmailStatus = 'idle' | 'success' | 'error'

export function AuthSignup({ open, onOpenChange }: AuthSignupProps) {
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')

  const checkEmail = () => {
    setEmailStatus((current) => (current === 'success' ? 'error' : 'success'))
  }

  return (
    <AuthModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="회원가입"
      description="기본 정보를 입력하고 Ait와 함께 면접을 준비하세요."
    >
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-4">
          <label className="auth-field-label" htmlFor="signup-name">
            <span>이름</span>
            <Input id="signup-name" autoComplete="name" />
          </label>

          <div className="auth-field-label items-start">
            <label htmlFor="signup-email" className="pt-2 font-semibold">이메일</label>
            <div>
              <Input id="signup-email" type="email" autoComplete="email" aria-describedby="email-availability" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p
                  id="email-availability"
                  className={`inline-flex items-center gap-1 text-caption ${
                    emailStatus === 'success'
                      ? 'text-status-success'
                      : emailStatus === 'error'
                        ? 'text-status-error'
                        : 'text-text-secondary'
                  }`}
                  aria-live="polite"
                >
                  {emailStatus === 'success' ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}
                  {emailStatus === 'error' ? <AlertCircle className="size-4" aria-hidden="true" /> : null}
                  {emailStatus === 'success'
                    ? '사용 가능한 이메일'
                    : emailStatus === 'error'
                      ? '이미 사용 중인 이메일'
                      : '이메일 사용 여부를 확인해주세요'}
                </p>
                <Button type="button" variant="secondary" onClick={checkEmail}>
                  중복 확인
                </Button>
              </div>
            </div>
          </div>

          <label className="auth-field-label" htmlFor="signup-password">
            <span>비밀번호</span>
            <Input id="signup-password" type="password" autoComplete="new-password" />
          </label>
          <label className="auth-field-label" htmlFor="signup-password-confirm">
            <span>비밀번호 확인</span>
            <Input id="signup-password-confirm" type="password" autoComplete="new-password" />
          </label>
        </div>

        <SocialAuthButtons />

        <p className="mt-6 text-center text-body-2 text-text-secondary">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="rounded-ait-s px-2 py-1 font-semibold text-action-primary">
            로그인
          </Link>
        </p>
      </form>
    </AuthModalShell>
  )
}


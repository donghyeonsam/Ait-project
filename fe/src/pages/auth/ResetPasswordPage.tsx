import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/

const resetPasswordSchema = z
  .object({
    email: z.string().trim().email('올바른 이메일 형식을 입력해주세요.'),
    password: z
      .string()
      .regex(passwordPattern, '영문, 숫자, 특수문자를 포함해 8자 이상 입력해주세요.'),
    passwordConfirm: z.string().min(1, '비밀번호를 다시 입력해주세요.'),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않습니다.',
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

const TOTAL_STEPS = 3

const stepDescriptions = {
  1: '가입한 이메일로 인증번호를 보내드려요.',
  2: '메일로 받은 인증번호를 입력해주세요.',
  3: '새로 사용할 비밀번호를 입력해주세요.',
} as const

// 비밀번호 재설정 플로우. 이메일 인증을 거쳐 새 비밀번호를 설정하는 3단계 화면이다.
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [verificationCode, setVerificationCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
      password: '',
      passwordConfirm: '',
    },
  })

  // TODO: 실제 API 연동 필요 - BE에 인증번호 발송 엔드포인트가 없어 이메일 형식 검사만 수행한다.
  const sendVerificationCode = async () => {
    const isValid = await trigger('email')
    if (!isValid) return
    setVerificationCode('')
    setCodeError(null)
    setStep(2)
  }

  // TODO: 실제 API 연동 필요 - BE에 인증번호 확인 엔드포인트가 없어 코드가 입력되면 통과 처리한다.
  const confirmVerificationCode = () => {
    if (!verificationCode.trim()) {
      setCodeError('인증번호를 입력해주세요.')
      return
    }
    setCodeError(null)
    setStep(3)
  }

  // TODO: 실제 API 연동 필요 - BE 비밀번호 재설정 엔드포인트가 준비되면 저장 요청으로 교체한다.
  const onSubmit = async () => {
    setIsCompleted(true)
  }

  if (isCompleted) {
    return (
      <AuthLayout>
        <AuthCard
          title="비밀번호 재설정 완료"
          description="새 비밀번호로 다시 로그인해주세요."
        >
          <p className="mt-4 text-center text-body-2 text-text-secondary" role="status">
            비밀번호가 안전하게 변경됐어요.
          </p>
          <Button
            type="button"
            className="mt-6 w-full"
            onClick={() => navigate('/login', { replace: true })}
          >
            로그인 하러 가기
          </Button>
        </AuthCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthCard title="비밀번호 재설정" description={stepDescriptions[step]}>
        <p className="text-body-2 font-medium text-text-secondary">
          <span className="text-action-primary">{step}</span> / {TOTAL_STEPS} 단계
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 flex min-h-72 flex-col">
          {step === 1 ? (
            <div key={step} className="survey-step flex flex-1 flex-col justify-center">
              <label htmlFor="reset-email" className="text-body-2 font-semibold">
                이메일
              </label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="가입한 이메일을 입력하세요"
                className="mt-2"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'reset-email-error' : undefined}
                {...register('email')}
              />
              {errors.email ? (
                <p id="reset-email-error" className="mt-2 text-caption text-status-error">
                  {errors.email.message}
                </p>
              ) : null}

              <Button type="button" className="mt-6 w-full" onClick={sendVerificationCode}>
                인증번호 발송
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div key={step} className="survey-step flex flex-1 flex-col justify-center">
              <p className="text-body-2 text-text-secondary" role="status">
                <span className="font-semibold text-text-primary">{getValues('email')}</span>
                (으)로 인증번호를 발송했어요.
              </p>

              <label htmlFor="reset-verification-code" className="mt-4 text-body-2 font-semibold">
                인증번호
              </label>
              <Input
                id="reset-verification-code"
                autoComplete="off"
                placeholder="인증번호를 입력하세요"
                className="mt-2"
                aria-invalid={Boolean(codeError)}
                aria-describedby={codeError ? 'reset-verification-code-error' : undefined}
                value={verificationCode}
                onChange={(event) => {
                  setVerificationCode(event.target.value)
                  setCodeError(null)
                }}
              />
              {codeError ? (
                <p
                  id="reset-verification-code-error"
                  className="mt-2 text-caption text-status-error"
                >
                  {codeError}
                </p>
              ) : null}

              <Button type="button" className="mt-6 w-full" onClick={confirmVerificationCode}>
                인증번호 확인
              </Button>
              <Button
                type="button"
                variant="text"
                className="mt-2 w-full"
                onClick={() => void sendVerificationCode()}
              >
                인증번호 재발송
              </Button>
            </div>
          ) : null}

          {step === 3 ? (
            <div key={step} className="survey-step flex flex-1 flex-col justify-center gap-4">
              <PasswordInput
                id="reset-password"
                label="새 비밀번호"
                placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <PasswordInput
                id="reset-password-confirm"
                label="새 비밀번호 확인"
                placeholder="비밀번호 재입력"
                autoComplete="new-password"
                error={errors.passwordConfirm?.message}
                {...register('passwordConfirm')}
              />

              <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
                비밀번호 변경
              </Button>
            </div>
          ) : null}
        </form>

        <p className="mt-4 text-center text-body-2 text-text-secondary">
          비밀번호가 기억나셨나요?{' '}
          <Link
            to="/login"
            className="font-bold text-action-primary decoration-status-achievement underline decoration-2 underline-offset-4"
          >
            로그인
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

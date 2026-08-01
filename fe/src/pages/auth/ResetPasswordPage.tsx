import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
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

const TOTAL_STEPS = 2
const RESEND_COOLDOWN_SECONDS = 30
const CODE_EXPIRY_SECONDS = 300

const stepDescriptions = {
  1: '가입한 이메일로 인증코드를 받고 확인해주세요.',
  2: '새로 사용할 비밀번호를 입력해주세요.',
} as const

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

// 비밀번호 재설정 플로우. 이메일 인증을 거쳐 새 비밀번호를 설정하는 2단계 화면이다.
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isCodeVerified, setIsCodeVerified] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [codeValiditySeconds, setCodeValiditySeconds] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const isCodeExpired = isCodeSent && !isCodeVerified && codeValiditySeconds <= 0

  // 발송/재발송 시 시작되는 재발송 대기 카운트다운.
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // 발송된 인증코드의 유효시간 카운트다운. 만료되면 재발송 전까지 확인이 막힌다.
  useEffect(() => {
    if (!isCodeSent || isCodeVerified || codeValiditySeconds <= 0) return
    const timer = setTimeout(() => setCodeValiditySeconds((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [isCodeSent, isCodeVerified, codeValiditySeconds])
  const {
    register,
    handleSubmit,
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

  // TODO: 실제 API 연동 필요 - BE에 인증코드 발송 엔드포인트가 없어 이메일 형식 검사만 수행한다.
  const sendVerificationCode = async () => {
    const isValid = await trigger('email')
    if (!isValid) return
    setIsCodeSent(true)
    setIsCodeVerified(false)
    setVerificationCode('')
    setCodeError(null)
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
    setCodeValiditySeconds(CODE_EXPIRY_SECONDS)
  }

  // TODO: 실제 API 연동 필요 - BE에 인증코드 확인 엔드포인트가 없어 만료 여부만 검사하고 통과 처리한다.
  const confirmVerificationCode = () => {
    if (isCodeExpired) {
      setCodeError('인증코드가 만료됐어요. 재발송해주세요.')
      return
    }
    if (!verificationCode.trim()) {
      setCodeError('인증코드를 입력해주세요.')
      return
    }
    setCodeError(null)
    setIsCodeVerified(true)
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
              <div className="grid grid-cols-[6.5rem_1fr] items-start gap-x-6 gap-y-2">
                <label htmlFor="reset-email" className="pt-2.5 text-body-2 font-semibold">
                  이메일
                </label>
                <div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="reset-email"
                      className="min-w-0 flex-1"
                      type="email"
                      autoComplete="email"
                      placeholder="가입한 이메일을 입력하세요"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'reset-email-error' : undefined}
                      {...register('email', {
                        onChange: () => {
                          setIsCodeSent(false)
                          setIsCodeVerified(false)
                          setVerificationCode('')
                          setCodeError(null)
                          setResendCooldown(0)
                          setCodeValiditySeconds(0)
                        },
                      })}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      disabled={isCodeVerified || resendCooldown > 0}
                      onClick={() => void sendVerificationCode()}
                    >
                      {isCodeVerified ? '인증 완료' : isCodeSent ? '재발송' : '인증하기'}
                    </Button>
                  </div>
                  <div className="mt-0.5 flex min-h-3 items-start justify-between gap-2 leading-tight">
                    {errors.email ? (
                      <p id="reset-email-error" className="text-caption leading-tight text-status-error">
                        {errors.email.message}
                      </p>
                    ) : (
                      <span />
                    )}
                    {resendCooldown > 0 ? (
                      <span className="shrink-0 text-caption leading-tight text-text-secondary" role="status">
                        {formatCooldown(resendCooldown)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <label htmlFor="reset-verification-code" className="pt-2.5 text-body-2 font-semibold">
                  인증코드
                </label>
                <div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="reset-verification-code"
                      className="min-w-0 flex-1"
                      autoComplete="off"
                      placeholder={isCodeSent ? '인증코드를 입력하세요' : '인증하기를 먼저 눌러주세요'}
                      disabled={!isCodeSent || isCodeVerified || isCodeExpired}
                      aria-invalid={Boolean(codeError)}
                      aria-describedby={codeError ? 'reset-verification-code-error' : undefined}
                      value={verificationCode}
                      onChange={(event) => {
                        setVerificationCode(event.target.value)
                        setCodeError(null)
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      disabled={!isCodeSent || isCodeVerified || isCodeExpired}
                      onClick={confirmVerificationCode}
                    >
                      확인
                    </Button>
                  </div>
                  <div className="mt-0.5 min-h-3 leading-tight">
                    {codeError ? (
                      <p
                        id="reset-verification-code-error"
                        className="text-caption leading-tight text-status-error"
                      >
                        {codeError}
                      </p>
                    ) : isCodeVerified ? (
                      <p className="text-caption leading-tight text-status-success">
                        이메일 인증이 완료됐어요.
                      </p>
                    ) : isCodeExpired ? (
                      <p className="text-caption leading-tight text-status-error" role="status">
                        인증코드가 만료됐어요. 재발송해주세요.
                      </p>
                    ) : isCodeSent ? (
                      <p className="text-caption leading-tight text-text-secondary" role="status">
                        인증코드를 발송했어요. 메일함을 확인해주세요.{' '}
                        <span className="text-status-error">
                          남은 시간 {formatCooldown(codeValiditySeconds)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                className="mt-6 w-full"
                disabled={!isCodeVerified}
                onClick={() => setStep(2)}
              >
                다음
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
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

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { sendSignupEmailCode, signup, verifySignupEmailCode } from '@/api/auth'
import { toErrorMessage } from '@/api/http'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { SocialButton } from '@/components/auth/SocialButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildGoogleAuthUrl } from '@/lib/googleOAuth'

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/

const signupSchema = z
  .object({
    name: z.string().trim().min(1, '이름을 입력해주세요.'),
    nickname: z
      .string()
      .trim()
      .min(2, '닉네임은 2자 이상 입력해주세요.')
      .max(12, '닉네임은 12자 이하로 입력해주세요.'),
    nicknameChecked: z.boolean().refine(Boolean, '닉네임 중복확인을 해주세요.'),
    email: z.string().trim().email('올바른 이메일 형식을 입력해주세요.'),
    emailChecked: z.boolean().refine(Boolean, '이메일 중복확인을 해주세요.'),
    emailVerified: z.boolean().refine(Boolean, '이메일 인증을 완료해주세요.'),
    password: z
      .string()
      .regex(passwordPattern, '영문, 숫자, 특수문자를 포함해 8자 이상 입력해주세요.'),
    passwordConfirm: z.string().min(1, '비밀번호를 다시 입력해주세요.'),
    termsAccepted: z.boolean().refine(Boolean, '이용약관에 동의해주세요.'),
    privacyAccepted: z.boolean().refine(Boolean, '개인정보 수집 및 이용에 동의해주세요.'),
    marketingAccepted: z.boolean(),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않습니다.',
  })

type SignupFormValues = z.infer<typeof signupSchema>

const TOTAL_STEPS = 2

const DUPLICATE_CHECK_DELAY_MS = 400
const RESEND_COOLDOWN_SECONDS = 60
const CODE_EXPIRY_SECONDS = 300

const stepDescriptions = {
  1: '이용약관에 동의하고 시작해보세요.',
  2: '가입에 필요한 정보를 입력해주세요.',
} as const

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export function SignupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      nickname: '',
      nicknameChecked: false,
      email: '',
      emailChecked: false,
      emailVerified: false,
      password: '',
      passwordConfirm: '',
      termsAccepted: false,
      privacyAccepted: false,
      marketingAccepted: false,
    },
  })

  const [termsAccepted, privacyAccepted, emailVerified, nicknameChecked, emailChecked, nickname, email] = useWatch({
    control,
    name: ['termsAccepted', 'privacyAccepted', 'emailVerified', 'nicknameChecked', 'emailChecked', 'nickname', 'email'],
  })

  const [verificationCode, setVerificationCode] = useState('')
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isCheckingNickname, setIsCheckingNickname] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [codeValiditySeconds, setCodeValiditySeconds] = useState(0)
  const isCodeExpired = isCodeSent && !emailVerified && codeValiditySeconds <= 0

  // 발송/재발송 시 시작되는 재발송 대기 카운트다운.
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // 발송된 인증코드의 유효시간 카운트다운. 만료되면 재발송 전까지 확인이 막힌다.
  useEffect(() => {
    if (!isCodeSent || emailVerified || codeValiditySeconds <= 0) return
    const timer = setTimeout(() => setCodeValiditySeconds((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [isCodeSent, emailVerified, codeValiditySeconds])

  // 닉네임 입력이 멈추면 자동으로 중복확인을 수행한다.
  // TODO: 실제 API 연동 필요 - BE에 닉네임 중복확인 엔드포인트가 없어 형식 검사만 통과하면 사용 가능한 것으로 처리한다.
  useEffect(() => {
    if (!nickname?.trim()) return
    const timer = setTimeout(async () => {
      const isValid = await trigger('nickname')
      setValue('nicknameChecked', isValid, { shouldValidate: true })
      setIsCheckingNickname(false)
    }, DUPLICATE_CHECK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [nickname, trigger, setValue])

  // 이메일 입력이 멈추면 자동으로 중복확인을 수행한다.
  // TODO: 실제 API 연동 필요 - BE에 이메일 중복확인 엔드포인트가 없어 형식 검사만 통과하면 사용 가능한 것으로 처리한다.
  useEffect(() => {
    if (!email?.trim()) return
    const timer = setTimeout(async () => {
      const isValid = await trigger('email')
      setValue('emailChecked', isValid, { shouldValidate: true })
      setIsCheckingEmail(false)
    }, DUPLICATE_CHECK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [email, trigger, setValue])

  const requestVerificationCode = async () => {
    const isValid = await trigger('email')
    if (!isValid) return
    setIsSendingCode(true)
    setVerificationError(null)
    try {
      await sendSignupEmailCode(email)
      setIsCodeSent(true)
      setVerificationCode('')
      setValue('emailVerified', false)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setCodeValiditySeconds(CODE_EXPIRY_SECONDS)
    } catch (error) {
      setVerificationError(toErrorMessage(error))
    } finally {
      setIsSendingCode(false)
    }
  }

  const confirmVerificationCode = async () => {
    if (isCodeExpired) {
      setVerificationError('인증코드가 만료됐어요. 재발송해주세요.')
      return
    }
    if (!verificationCode.trim()) {
      setVerificationError('인증코드를 입력해주세요.')
      return
    }
    setIsVerifyingCode(true)
    setVerificationError(null)
    try {
      await verifySignupEmailCode(email, verificationCode.trim())
      setValue('emailVerified', true, { shouldValidate: true })
    } catch (error) {
      setVerificationError(toErrorMessage(error))
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const goToNextStep = async () => {
    const isAgreementValid = await trigger(['termsAccepted', 'privacyAccepted'])
    if (isAgreementValid) setStep(2)
  }

  const goToPreviousStep = () => setStep(1)

  const onSubmit = async (values: SignupFormValues) => {
    try {
      await signup({
        email: values.email,
        password: values.password,
        name: values.name,
        nickname: values.nickname,
      })
      navigate('/login', { replace: true })
    } catch (error) {
      setError('root', { message: toErrorMessage(error) })
    }
  }

  const isSubmitDisabled =
    !termsAccepted ||
    !privacyAccepted ||
    !nicknameChecked ||
    !emailChecked ||
    !emailVerified ||
    isCheckingNickname ||
    isCheckingEmail ||
    isSubmitting

  return (
    <AuthLayout>
      <AuthCard title="Ait 회원가입" description={stepDescriptions[step]}>
        <p className="text-body-2 font-medium text-text-secondary">
          <span className="text-action-primary">{step}</span> / {TOTAL_STEPS} 단계
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 flex min-h-96 flex-col">
          {step === 1 ? (
            <div key={step} className="survey-step mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
              <fieldset className="space-y-3">
                <legend className="sr-only">약관 동의</legend>
                <div>
                  <div className="flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-body-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-action-primary"
                        {...register('termsAccepted')}
                      />
                      [필수] 이용약관에 동의합니다.
                    </label>
                    <Link to="/terms" className="text-body-2 font-semibold text-action-primary">
                      보기
                    </Link>
                  </div>
                  {errors.termsAccepted ? (
                    <p className="mt-1 text-caption text-status-error">
                      {errors.termsAccepted.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-body-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-action-primary"
                        {...register('privacyAccepted')}
                      />
                      [필수] 개인정보 수집 및 이용에 동의합니다.
                    </label>
                    <Link to="/privacy" className="text-body-2 font-semibold text-action-primary">
                      보기
                    </Link>
                  </div>
                  {errors.privacyAccepted ? (
                    <p className="mt-1 text-caption text-status-error">
                      {errors.privacyAccepted.message}
                    </p>
                  ) : null}
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-body-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-action-primary"
                    {...register('marketingAccepted')}
                  />
                  [선택] 면접 정보와 이벤트 소식을 받겠습니다.
                </label>
              </fieldset>

              <Button type="button" className="mt-6 w-full" onClick={goToNextStep}>
                다음
              </Button>

              <div className="my-4 flex items-center gap-4 text-caption text-text-secondary" aria-hidden="true">
                <span className="h-px flex-1 bg-border-default" />
                또는 간편 회원가입
                <span className="h-px flex-1 bg-border-default" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SocialButton provider="google" onClick={() => { window.location.href = buildGoogleAuthUrl() }}>
                  Google
                </SocialButton>
                {/* TODO: 실제 API 연동 필요 - 백엔드에 GitHub OAuth 클라이언트가 아직 없다. */}
                <SocialButton provider="github" onClick={() => console.log('GitHub 회원가입')}>
                  GitHub
                </SocialButton>
              </div>

              <p className="mt-4 text-center text-body-2 text-text-secondary">
                이미 계정이 있으신가요?{' '}
                <Link
                  to="/login"
                  className="font-bold text-action-primary decoration-status-achievement underline decoration-2 underline-offset-4"
                >
                  로그인
                </Link>
              </p>
            </div>
          ) : null}

          {step === 2 ? (
            <div key={step} className="survey-step mx-auto flex w-full max-w-xl flex-1 flex-col">
              <div className="flex flex-1 flex-col justify-center">
                <div className="grid grid-cols-[6.5rem_1fr] items-start gap-x-6 gap-y-2">
                  <label htmlFor="signup-name" className="pt-2.5 text-body-2 font-semibold">
                    이름
                  </label>
                  <div>
                    <Input
                      id="signup-name"
                      autoComplete="name"
                      placeholder="이름을 입력하세요"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'signup-name-error' : undefined}
                      {...register('name')}
                    />
                    {errors.name ? (
                      <p id="signup-name-error" className="mt-1 text-caption text-status-error">
                        {errors.name.message}
                      </p>
                    ) : null}
                  </div>

                  <label htmlFor="signup-nickname" className="pt-2.5 text-body-2 font-semibold">
                    닉네임
                  </label>
                  <div>
                    <Input
                      id="signup-nickname"
                      autoComplete="off"
                      placeholder="다른 사용자에게 보여질 닉네임을 입력하세요"
                      aria-invalid={Boolean(errors.nickname)}
                      aria-describedby={errors.nickname ? 'signup-nickname-error' : undefined}
                      {...register('nickname', {
                        onChange: (event) => {
                          setValue('nicknameChecked', false)
                          setIsCheckingNickname(Boolean(event.target.value.trim()))
                        },
                      })}
                    />
                    <div className="mt-0.5 min-h-3 leading-tight">
                      {errors.nickname ? (
                        <p id="signup-nickname-error" className="text-caption leading-tight text-status-error">
                          {errors.nickname.message}
                        </p>
                      ) : isCheckingNickname ? (
                        <p className="text-caption leading-tight text-text-secondary">중복확인 중...</p>
                      ) : errors.nicknameChecked ? (
                        <p className="text-caption leading-tight text-status-error">
                          {errors.nicknameChecked.message}
                        </p>
                      ) : nicknameChecked ? (
                        <p className="text-caption leading-tight text-status-success">사용 가능한 닉네임이에요.</p>
                      ) : null}
                    </div>
                  </div>

                  <label htmlFor="signup-email" className="pt-2.5 text-body-2 font-semibold">
                    이메일
                  </label>
                  <div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="signup-email"
                        className="min-w-0 flex-1"
                        type="email"
                        autoComplete="email"
                        placeholder="이메일을 입력하세요"
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'signup-email-error' : undefined}
                        {...register('email', {
                          onChange: (event) => {
                            setValue('emailChecked', false)
                            setValue('emailVerified', false)
                            setVerificationCode('')
                            setVerificationError(null)
                            setIsCodeSent(false)
                            setIsCheckingEmail(Boolean(event.target.value.trim()))
                            setResendCooldown(0)
                            setCodeValiditySeconds(0)
                          },
                        })}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        disabled={emailVerified || resendCooldown > 0 || isSendingCode}
                        onClick={requestVerificationCode}
                      >
                        {emailVerified
                          ? '인증 완료'
                          : isSendingCode
                            ? '발송 중...'
                            : isCodeSent
                              ? '재발송'
                              : '인증하기'}
                      </Button>
                    </div>
                    <div className="mt-0.5 flex min-h-3 items-start justify-between gap-2 leading-tight">
                      {errors.email ? (
                        <p id="signup-email-error" className="text-caption leading-tight text-status-error">
                          {errors.email.message}
                        </p>
                      ) : isCheckingEmail ? (
                        <p className="text-caption leading-tight text-text-secondary">중복확인 중...</p>
                      ) : errors.emailChecked ? (
                        <p className="text-caption leading-tight text-status-error">{errors.emailChecked.message}</p>
                      ) : emailChecked ? (
                        <p className="text-caption leading-tight text-status-success">사용 가능한 이메일이에요.</p>
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

                  <label htmlFor="signup-verification-code" className="pt-2.5 text-body-2 font-semibold">
                    인증코드
                  </label>
                  <div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="signup-verification-code"
                        className="min-w-0 flex-1"
                        autoComplete="off"
                        placeholder={
                          isCodeSent ? '인증코드를 입력하세요' : '인증하기를 먼저 눌러주세요'
                        }
                        disabled={!isCodeSent || emailVerified || isCodeExpired || isVerifyingCode}
                        aria-invalid={Boolean(verificationError)}
                        aria-describedby={verificationError ? 'signup-verification-code-error' : undefined}
                        value={verificationCode}
                        onChange={(event) => {
                          setVerificationCode(event.target.value)
                          setVerificationError(null)
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        disabled={!isCodeSent || emailVerified || isCodeExpired || isVerifyingCode}
                        onClick={confirmVerificationCode}
                      >
                        {isVerifyingCode ? '확인 중...' : '확인'}
                      </Button>
                    </div>
                    <div className="mt-0.5 min-h-3 leading-tight">
                      {verificationError ? (
                        <p id="signup-verification-code-error" className="text-caption leading-tight text-status-error">
                          {verificationError}
                        </p>
                      ) : emailVerified ? (
                        <p className="text-caption leading-tight text-status-success">이메일 인증이 완료됐어요.</p>
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

                  <label htmlFor="signup-password" className="pt-2.5 text-body-2 font-semibold">
                    비밀번호
                  </label>
                  <PasswordInput
                    id="signup-password"
                    label="비밀번호"
                    hideLabel
                    placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                    autoComplete="new-password"
                    error={errors.password?.message}
                    {...register('password')}
                  />

                  <label htmlFor="signup-password-confirm" className="pt-2.5 text-body-2 font-semibold">
                    비밀번호 확인
                  </label>
                  <PasswordInput
                    id="signup-password-confirm"
                    label="비밀번호 확인"
                    hideLabel
                    placeholder="비밀번호 재입력"
                    autoComplete="new-password"
                    error={errors.passwordConfirm?.message}
                    {...register('passwordConfirm')}
                  />
                </div>
              </div>

              <div className="mt-auto flex gap-3 pt-6">
                <Button type="button" variant="secondary" className="w-full" onClick={goToPreviousStep}>
                  이전으로
                </Button>
                <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
                  {isSubmitting ? '가입 중...' : '가입하기'}
                </Button>
              </div>

              {errors.root ? (
                <p className="mt-3 text-center text-caption text-status-error" role="alert">
                  {errors.root.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
      </AuthCard>
    </AuthLayout>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { signup } from '@/api/auth'
import { toErrorMessage } from '@/api/http'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { SocialButton } from '@/components/auth/SocialButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

const CUSTOM_DOMAIN_OPTION = '직접입력'
const emailDomainOptions = ['gmail.com', 'naver.com', 'daum.net', 'kakao.com', 'nate.com', CUSTOM_DOMAIN_OPTION]

const stepDescriptions = {
  1: '이용약관에 동의하고 시작해보세요.',
  2: '가입에 필요한 정보를 입력해주세요.',
} as const

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

  const [termsAccepted, privacyAccepted, emailVerified, nicknameChecked, emailChecked] = useWatch({
    control,
    name: ['termsAccepted', 'privacyAccepted', 'emailVerified', 'nicknameChecked', 'emailChecked'],
  })

  const [emailLocalPart, setEmailLocalPart] = useState('')
  const [emailDomain, setEmailDomain] = useState(emailDomainOptions[0])
  const [customDomain, setCustomDomain] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const isCustomDomain = emailDomain === CUSTOM_DOMAIN_OPTION

  // 이메일이 바뀌면 기존 중복확인·인증 상태와 입력한 인증번호를 무효화한다.
  const updateEmail = (localPart: string, domain: string) => {
    setValue('email', localPart ? `${localPart}@${domain}` : '', { shouldValidate: false })
    setValue('emailChecked', false)
    setValue('emailVerified', false)
    setVerificationCode('')
  }

  // TODO: 실제 API 연동 필요 - BE에 닉네임 중복확인 엔드포인트가 없어 형식 검사만 통과하면 사용 가능한 것으로 처리한다.
  const checkNicknameDuplicate = async () => {
    const isValid = await trigger('nickname')
    if (isValid) setValue('nicknameChecked', true, { shouldValidate: true })
  }

  // TODO: 실제 API 연동 필요 - BE에 이메일 중복확인 엔드포인트가 없어 형식 검사만 통과하면 사용 가능한 것으로 처리한다.
  const checkEmailDuplicate = async () => {
    const isValid = await trigger('email')
    if (isValid) setValue('emailChecked', true, { shouldValidate: true })
  }

  // TODO: 실제 API 연동 필요 - BE에 인증번호 발송 엔드포인트가 없어 이메일 형식 검사만 수행한다.
  const requestVerificationCode = async () => {
    await trigger('email')
  }

  // TODO: 실제 API 연동 필요 - BE에 인증번호 확인 엔드포인트가 없어 코드가 입력되면 인증된 것으로 처리한다.
  const confirmVerificationCode = () => {
    if (!verificationCode.trim()) return
    setValue('emailVerified', true, { shouldValidate: true })
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
                <SocialButton provider="google" onClick={() => console.log('Google 회원가입')}>
                  Google
                </SocialButton>
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
                <div className="grid grid-cols-[6.5rem_1fr] items-start gap-x-6 gap-y-5">
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
                      <p id="signup-name-error" className="mt-2 text-caption text-status-error">
                        {errors.name.message}
                      </p>
                    ) : null}
                  </div>

                  <label htmlFor="signup-nickname" className="pt-2.5 text-body-2 font-semibold">
                    닉네임
                  </label>
                  <div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="signup-nickname"
                        className="min-w-0 flex-1"
                        autoComplete="off"
                        placeholder="다른 사용자에게 보여질 닉네임을 입력하세요"
                        aria-invalid={Boolean(errors.nickname)}
                        aria-describedby={errors.nickname ? 'signup-nickname-error' : undefined}
                        {...register('nickname', {
                          onChange: () => setValue('nicknameChecked', false),
                        })}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        onClick={checkNicknameDuplicate}
                      >
                        중복확인
                      </Button>
                    </div>
                    {errors.nickname ? (
                      <p id="signup-nickname-error" className="mt-2 text-caption text-status-error">
                        {errors.nickname.message}
                      </p>
                    ) : errors.nicknameChecked ? (
                      <p className="mt-2 text-caption text-status-error">
                        {errors.nicknameChecked.message}
                      </p>
                    ) : nicknameChecked ? (
                      <p className="mt-2 text-caption text-status-success">사용 가능한 닉네임이에요.</p>
                    ) : null}
                  </div>

                  <label htmlFor="signup-email-local" className="pt-2.5 text-body-2 font-semibold">
                    이메일
                  </label>
                  <div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="signup-email-local"
                        className="min-w-0 flex-1"
                        autoComplete="off"
                        placeholder="이메일"
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'signup-email-error' : undefined}
                        value={emailLocalPart}
                        onChange={(event) => {
                          setEmailLocalPart(event.target.value)
                          updateEmail(event.target.value, isCustomDomain ? customDomain : emailDomain)
                        }}
                      />
                      <span className="shrink-0 text-body-2 text-text-secondary">@</span>
                      <select
                        value={emailDomain}
                        onChange={(event) => {
                          const nextDomain = event.target.value
                          setEmailDomain(nextDomain)
                          updateEmail(emailLocalPart, nextDomain === CUSTOM_DOMAIN_OPTION ? customDomain : nextDomain)
                        }}
                        className="h-11 shrink-0 rounded-ait-s border border-border-default bg-surface-default px-3 text-body-2"
                      >
                        {emailDomainOptions.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        onClick={checkEmailDuplicate}
                      >
                        중복확인
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        onClick={requestVerificationCode}
                      >
                        인증하기
                      </Button>
                    </div>
                    {isCustomDomain ? (
                      <Input
                        className="mt-2"
                        autoComplete="off"
                        placeholder="도메인을 직접 입력하세요 (예: naver.com)"
                        value={customDomain}
                        onChange={(event) => {
                          setCustomDomain(event.target.value)
                          updateEmail(emailLocalPart, event.target.value)
                        }}
                      />
                    ) : null}
                    {errors.email ? (
                      <p id="signup-email-error" className="mt-2 text-caption text-status-error">
                        {errors.email.message}
                      </p>
                    ) : errors.emailChecked ? (
                      <p className="mt-2 text-caption text-status-error">
                        {errors.emailChecked.message}
                      </p>
                    ) : emailChecked ? (
                      <p className="mt-2 text-caption text-status-success">사용 가능한 이메일이에요.</p>
                    ) : null}
                  </div>

                  <label htmlFor="signup-verification-code" className="pt-2.5 text-body-2 font-semibold">
                    인증번호
                  </label>
                  <div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="signup-verification-code"
                        className="min-w-0 flex-1"
                        autoComplete="off"
                        placeholder="인증번호를 입력하세요"
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        onClick={confirmVerificationCode}
                      >
                        확인
                      </Button>
                    </div>
                    {emailVerified ? (
                      <p className="mt-2 text-caption text-status-success">이메일 인증이 완료됐어요.</p>
                    ) : null}
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

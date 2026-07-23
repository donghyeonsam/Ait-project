import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { signup } from '@/api/auth'
import { toErrorMessage } from '@/api/http'
import signupIllustration from '@/assets/images/auth/signup-illustration.svg'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { SignupStepper } from '@/components/auth/SignupStepper'
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
    email: z.string().trim().email('올바른 이메일 형식을 입력해주세요.'),
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

function SignupAside() {
  return (
    <>
      <div>
        <p className="flex items-center gap-2 text-body-2 font-bold tracking-widest text-action-primary">
          <span className="h-1 w-6 rounded-ait-pill bg-status-achievement" aria-hidden="true" />
          START WITH AIT
        </p>
        <h2 className="mt-6 text-display text-text-primary">
          오늘의 연습이
          <br />
          내일의 자신감으로
        </h2>
        <p className="mt-4 text-body-1 text-text-secondary">
          Ait에서 나만의 면접 데이터를 쌓고
          <br />
          성장 과정을 한눈에 확인해보세요.
        </p>
      </div>

      <img
        src={signupIllustration}
        alt=""
        aria-hidden="true"
        className="my-8 w-full"
      />

      <SignupStepper />
    </>
  )
}

export function SignupPage() {
  const navigate = useNavigate()
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
      email: '',
      emailVerified: false,
      password: '',
      passwordConfirm: '',
      termsAccepted: false,
      privacyAccepted: false,
      marketingAccepted: false,
    },
  })

  const [termsAccepted, privacyAccepted, emailVerified] = useWatch({
    control,
    name: ['termsAccepted', 'privacyAccepted', 'emailVerified'],
  })
  const emailRegistration = register('email')

  // TODO: 실제 API 연동 필요 - BE에 이메일 인증 엔드포인트가 없어 형식 검사만 통과하면 인증된 것으로 처리한다.
  const verifyEmail = async () => {
    const isEmailValid = await trigger('email')
    setValue('emailVerified', isEmailValid, { shouldValidate: true })
  }

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
    !termsAccepted || !privacyAccepted || !emailVerified || isSubmitting

  return (
    <AuthLayout aside={<SignupAside />}>
      <AuthCard title="Ait 회원가입" description="면접 역량을 키우는 첫걸음을 시작해보세요.">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="signup-name" className="mb-2 block text-body-2 font-semibold">
              이름
            </label>
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

          <div className="mt-4">
            <label htmlFor="signup-nickname" className="mb-2 block text-body-2 font-semibold">
              닉네임
            </label>
            <Input
              id="signup-nickname"
              autoComplete="off"
              placeholder="다른 사용자에게 보여질 닉네임을 입력하세요"
              aria-invalid={Boolean(errors.nickname)}
              aria-describedby={errors.nickname ? 'signup-nickname-error' : undefined}
              {...register('nickname')}
            />
            {errors.nickname ? (
              <p id="signup-nickname-error" className="mt-2 text-caption text-status-error">
                {errors.nickname.message}
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <label htmlFor="signup-email" className="mb-2 block text-body-2 font-semibold">
              이메일
            </label>
            <div className="flex gap-3">
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="example@email.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                {...emailRegistration}
                onChange={(event) => {
                  emailRegistration.onChange(event)
                  setValue('emailVerified', false)
                }}
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                aria-pressed={emailVerified}
                onClick={verifyEmail}
              >
                인증하기
              </Button>
            </div>
            {errors.email ? (
              <p id="signup-email-error" className="mt-2 text-caption text-status-error">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <PasswordInput
              id="signup-password"
              label="비밀번호"
              placeholder="8자 이상 입력"
              autoComplete="new-password"
              error={errors.password?.message}
              helperText="영문, 숫자, 특수문자 포함 8자 이상"
              {...register('password')}
            />
            <PasswordInput
              id="signup-password-confirm"
              label="비밀번호 확인"
              placeholder="비밀번호 재입력"
              autoComplete="new-password"
              error={errors.passwordConfirm?.message}
              {...register('passwordConfirm')}
            />
          </div>

          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only">약관 동의</legend>
            <div>
              <div className="flex items-center justify-between gap-4">
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
                <p className="mt-2 text-caption text-status-error">
                  {errors.termsAccepted.message}
                </p>
              ) : null}
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
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
                <p className="mt-2 text-caption text-status-error">
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

          <Button type="submit" className="mt-6 w-full" disabled={isSubmitDisabled}>
            {isSubmitting ? '가입 중...' : '가입하기'}
          </Button>

          {errors.root ? (
            <p className="mt-3 text-center text-caption text-status-error" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <div className="my-6 flex items-center gap-4 text-caption text-text-secondary" aria-hidden="true">
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

          <p className="mt-6 text-center text-body-2 text-text-secondary">
            이미 계정이 있으신가요?{' '}
            <Link
              to="/login"
              className="font-bold text-action-primary decoration-status-achievement underline decoration-2 underline-offset-4"
            >
              로그인
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  )
}

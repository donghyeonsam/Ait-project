import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { login } from '@/api/auth'
import { toErrorMessage } from '@/api/http'
import loginIllustration from '@/assets/images/auth/login-illustration.svg'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { SocialButton } from '@/components/auth/SocialButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/useAuth'

const loginSchema = z.object({
  email: z.string().trim().email('올바른 이메일 형식을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
  rememberMe: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const loginBenefits = [
  '맞춤형 AI 면접',
  '상세한 역량 분석',
  '실시간 면접 스터디',
]

function LoginAside() {
  return (
    <>
      <div>
        <p className="flex items-center gap-2 text-body-2 font-bold tracking-widest text-action-primary">
          <span className="h-1 w-6 rounded-ait-pill bg-status-achievement" aria-hidden="true" />
          AI INTERVIEW TRAINING
        </p>
        <h2 className="mt-6 text-display text-text-primary">
          면접 준비의 시작,
          <br />
          Ait와 함께하세요
        </h2>
        <p className="mt-4 text-body-1 text-text-secondary">
          AI 모의면접부터 스터디까지
          <br />
          실전처럼 연습하고 성장할 수 있어요.
        </p>
      </div>

      <ul className="mt-8 space-y-3">
        {loginBenefits.map((benefit) => (
          <li key={benefit} className="flex items-center gap-3 text-body-1 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-ait-pill bg-status-achievement-surface text-action-primary">
              <Check className="size-5" aria-hidden="true" />
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      <img
        src={loginIllustration}
        alt=""
        aria-hidden="true"
        className="absolute bottom-0 right-4 z-[var(--z-index-base)] w-2/5 max-w-xs"
      />
    </>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'hong@ssafy.com',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await login(values.email, values.password)
      signIn(response.accessToken, response.user, values.rememberMe)

      const routeState = location.state as { from?: string } | null
      navigate(routeState?.from ?? '/dashboard', { replace: true })
    } catch (error) {
      setError('root', { message: toErrorMessage(error) })
    }
  }

  return (
    <AuthLayout aside={<LoginAside />} showFooter showWave>
      <AuthCard title="다시 만나서 반가워요" description="Ait 계정으로 로그인하세요.">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-body-2 font-semibold">
              이메일
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-secondary"
                aria-hidden="true"
              />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="example@email.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                className="pl-10"
                {...register('email')}
              />
            </div>
            {errors.email ? (
              <p id="login-email-error" className="mt-2 text-caption text-status-error">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <PasswordInput
              id="login-password"
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              error={errors.password?.message}
              labelAction={
                <button
                  type="button"
                  className="text-body-2 font-semibold text-action-primary decoration-status-achievement underline decoration-2 underline-offset-4"
                >
                  비밀번호 찾기
                </button>
              }
              {...register('password')}
            />
          </div>

          <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-body-2 text-text-secondary">
            <input
              type="checkbox"
              className="size-4 accent-action-primary"
              {...register('rememberMe')}
            />
            로그인 상태 유지
          </label>

<<<<<<< HEAD
          <Button type="submit" className="mt-6 w-full" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </Button>

          {errors.root ? (
            <p className="mt-3 text-center text-caption text-status-error" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <div className="my-6 flex items-center gap-4 text-caption text-text-secondary" aria-hidden="true">
=======
          <Button type="submit" className="mt-4 w-full" disabled={isSubmitting}>
            로그인
          </Button>

          <div className="my-4 flex items-center gap-4 text-caption text-text-secondary" aria-hidden="true">
>>>>>>> 8b96c7653deaa70aa3188cb9bc501278d88dffd4
            <span className="h-px flex-1 bg-border-default" />
            또는
            <span className="h-px flex-1 bg-border-default" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SocialButton provider="google" onClick={() => console.log('Google 로그인')}>
              Google로 계속하기
            </SocialButton>
            <SocialButton provider="github" onClick={() => console.log('GitHub 로그인')}>
              GitHub로 계속하기
            </SocialButton>
          </div>

          <p className="mt-4 text-center text-body-2 text-text-secondary">
            Ait가 처음이신가요?{' '}
            <Link
              to="/signup"
              className="font-bold text-action-primary decoration-status-achievement underline decoration-2 underline-offset-4"
            >
              회원가입
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  )
}

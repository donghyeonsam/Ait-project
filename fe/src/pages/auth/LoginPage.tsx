import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { login } from '@/api/auth'
import { toErrorMessage } from '@/api/http'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { SocialButton } from '@/components/auth/SocialButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildGithubAuthUrl } from '@/lib/githubOAuth'
import { buildGoogleAuthUrl } from '@/lib/googleOAuth'
import { useAuth } from '@/lib/useAuth'

const loginSchema = z.object({
  email: z.string().trim().email('올바른 이메일 형식을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// 로그인 화면. 이메일/비밀번호로 인증하고 원래 가려던 경로(state.from) 또는 대시보드로 이동한다.
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
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await login(values.email, values.password)
      // 소셜 로그인과 동일하게 항상 localStorage에 저장해 새 탭에서도 로그인 상태를 유지한다.
      signIn(response.accessToken, response.user, true)

      // 보호된 경로에서 리다이렉트돼 왔다면 로그인 후 그 경로로 되돌려보낸다.
      const routeState = location.state as { from?: string } | null
      navigate(routeState?.from ?? '/dashboard', { replace: true })
    } catch (error) {
      setError('root', { message: toErrorMessage(error) })
    }
  }

  return (
    <AuthLayout showFooter>
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
              {...register('password')}
            />
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </Button>

          {errors.root ? (
            <p className="mt-3 text-center text-caption text-status-error" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <div className="my-6 flex items-center gap-4 text-caption text-text-secondary" aria-hidden="true">
            <span className="h-px flex-1 bg-border-default" />
            또는
            <span className="h-px flex-1 bg-border-default" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SocialButton provider="google" onClick={() => { window.location.href = buildGoogleAuthUrl() }}>
              Google로 계속하기
            </SocialButton>
            <SocialButton provider="github" onClick={() => { window.location.href = buildGithubAuthUrl() }}>
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

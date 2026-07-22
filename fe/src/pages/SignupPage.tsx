import { useNavigate } from 'react-router-dom'
import { AuthSignup } from '@/components/auth/AuthSignup'

export function SignupPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-svh bg-background-default">
      <AuthSignup open onOpenChange={(open) => !open && navigate('/')} />
    </div>
  )
}


import { useNavigate } from 'react-router-dom'
import { AuthLogin } from '@/components/auth/AuthLogin'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-svh bg-background-default">
      <AuthLogin open onOpenChange={(open) => !open && navigate('/')} />
    </div>
  )
}


import { useContext } from 'react'
import { AuthContext } from '@/app/auth-context'

// 인증 컨텍스트에 접근하는 훅. Provider 밖에서 쓰면 즉시 오류로 알린다.
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.')
  return context
}

import { useCallback, useRef, useState } from 'react'
import type { ToastItem } from '@/components/ui/toast'

// 토스트 스택 상태. showToast로 추가하면 3초 뒤 자동으로 사라진다.
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3000)
  }, [])

  return { toasts, showToast }
}

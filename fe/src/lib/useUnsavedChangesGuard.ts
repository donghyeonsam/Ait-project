import { useRef, useState } from 'react'

// 저장하지 않은 변경사항이 있을 때 페이지 이탈 동작을 확인 모달로 가로챈다.
export function useUnsavedChangesGuard(isDirty: boolean) {
  const [isConfirmOpen, setConfirmOpen] = useState(false)
  const pendingAction = useRef<(() => void) | null>(null)

  const guardNavigation = (action: () => void) => {
    if (isDirty) {
      pendingAction.current = action
      setConfirmOpen(true)
      return
    }
    action()
  }

  const runPendingAction = () => {
    const action = pendingAction.current
    pendingAction.current = null
    setConfirmOpen(false)
    action?.()
  }

  const cancel = () => {
    pendingAction.current = null
    setConfirmOpen(false)
  }

  return {
    isConfirmOpen,
    setConfirmOpen: (open: boolean) => (open ? setConfirmOpen(true) : cancel()),
    guardNavigation,
    runPendingAction,
    cancel,
  }
}

import { useEffect, useRef, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AuthModalShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
}

export function AuthModalShell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: AuthModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const animationFrame = window.requestAnimationFrame(() => {
      if (dialogRef.current) dialogRef.current.scrollTop = 0
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          window.requestAnimationFrame(() => {
            dialogRef.current?.focus({ preventScroll: true })
            if (dialogRef.current) dialogRef.current.scrollTop = 0
          })
        }}
        className="auth-dialog max-h-[calc(100svh-2rem)] overflow-y-auto p-0"
      >
        <div className="p-8 sm:p-10">
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-h1">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <img
            src="/mypage/auth-intro.png"
            alt="AI 코치와 화상 면접을 연습하는 지원자"
            className="mt-6 aspect-[3/2] w-full rounded-ait-m border border-border-default object-cover shadow-elevation-1"
          />

          <div className="mt-8">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

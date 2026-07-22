import { GitFork, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SocialAuthButtons() {
  return (
    <>
      <div className="my-6 flex items-center gap-4 text-body-2 font-semibold text-text-secondary" aria-hidden="true">
        <span className="h-px flex-1 bg-border-default" />
        OR
        <span className="h-px flex-1 bg-border-default" />
      </div>
      <div className="space-y-3">
        <Button type="button" className="w-full">
          <GitFork aria-hidden="true" />
          GitHub로 계속하기
        </Button>
        <Button type="button" variant="secondary" className="w-full">
          <Search aria-hidden="true" />
          Google로 계속하기
        </Button>
      </div>
    </>
  )
}

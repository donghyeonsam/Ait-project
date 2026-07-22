import { LandingHeader } from '@/components/layout/LandingHeader'

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background-default">
      <LandingHeader />
      <main
        id="main-content"
        className="flex-1"
        aria-label="Ait 랜딩 페이지"
      />
    </div>
  )
}

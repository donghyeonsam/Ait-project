import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  description: string
  children: ReactNode
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <section className="h-full rounded-ait-l border border-border-default bg-surface-default p-6 shadow-elevation-1 sm:p-8 xl:p-10">
      <header>
        <h1 className="text-h1 text-text-primary">{title}</h1>
        <p className="mt-2 text-body-1 text-text-secondary">{description}</p>
      </header>
      <div className="mt-8">{children}</div>
    </section>
  )
}

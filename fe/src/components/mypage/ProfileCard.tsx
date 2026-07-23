import { BriefcaseBusiness } from 'lucide-react'
import type { ProfileData } from '@/types/profile'

interface ProfileCardProps {
  profile: ProfileData
}

const roleClasses = [
  'bg-tag-be-surface text-tag-be',
  'bg-tag-ai-surface text-tag-ai',
]

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <aside className="profile-card mypage-enter" style={{ '--section-order': 1 } as React.CSSProperties}>
      <div className="flex items-center gap-2 text-caption font-semibold text-surface-default">
        <BriefcaseBusiness className="size-4" aria-hidden="true" />
        <span>Ait MEMBER</span>
      </div>

      <div
        className="mt-4 flex aspect-square w-full items-center justify-center rounded-ait-m bg-profile-avatar text-display font-bold text-action-primary"
        aria-label={`${profile.name} 프로필`}
      >
        {profile.name.slice(0, 1)}
      </div>

      <div className="mt-4 min-h-28">
        <h2 className="text-center text-h3 font-semibold text-surface-default">
          {profile.name}
        </h2>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {profile.roles.length ? profile.roles.map((role, index) => (
            <span
              key={role}
              className={`rounded-ait-pill px-3 py-1 text-caption font-semibold ${roleClasses[index % roleClasses.length]}`}
            >
              {role}
            </span>
          )) : (
            <span className="text-caption text-surface-default/75">등록된 직무가 없습니다.</span>
          )}
        </div>
      </div>
    </aside>
  )
}

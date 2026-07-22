import { BriefcaseBusiness } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { ProfileData } from '@/mocks/mypage'

interface ProfileCardProps {
  profile: ProfileData
  isEditing: boolean
  onChange: (profile: ProfileData) => void
}

const roleClasses = [
  'bg-tag-be-surface text-tag-be',
  'bg-tag-ai-surface text-tag-ai',
]

export function ProfileCard({
  profile,
  isEditing,
  onChange,
}: ProfileCardProps) {
  const updateRole = (index: number, value: string) => {
    const roles = [...profile.roles]
    roles[index] = value
    onChange({ ...profile, roles })
  }

  return (
    <aside className="profile-card mypage-enter" style={{ '--section-order': 1 } as React.CSSProperties}>
      <div className="flex items-center gap-2 text-caption font-semibold text-surface-default">
        <BriefcaseBusiness className="size-4" aria-hidden="true" />
        <span>Ait MEMBER</span>
      </div>

      <img
        src="/mypage/profile-kimssafy.png"
        alt="김싸피 프로필"
        className="mt-4 aspect-square w-full rounded-ait-m object-cover"
      />

      <div
        key={isEditing ? 'profile-edit' : 'profile-view'}
        className="profile-crossfade mt-4 min-h-28"
      >
        {isEditing ? (
          <div className="space-y-3">
            <label className="block text-caption font-semibold text-surface-default">
              이름
              <Input
                value={profile.name}
                onChange={(event) =>
                  onChange({ ...profile, name: event.target.value })
                }
                className="mt-1 border-surface-default"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {profile.roles.map((role, index) => (
                <label
                  key={index}
                  className="block text-caption font-semibold text-surface-default"
                >
                  관심 직무 {index + 1}
                  <Input
                    value={role}
                    onChange={(event) => updateRole(index, event.target.value)}
                    className="mt-1 px-2"
                  />
                </label>
              ))}
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-center text-h3 font-semibold text-surface-default">
              {profile.name}
            </h2>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {profile.roles.map((role, index) => (
                <span
                  key={role}
                  className={`rounded-ait-pill px-3 py-1 text-caption font-semibold ${roleClasses[index % roleClasses.length]}`}
                >
                  {role}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}


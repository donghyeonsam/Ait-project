import { BriefcaseBusiness, Camera } from 'lucide-react'
import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import type { ProfileData } from '@/types/profile'

interface ProfileCardProps {
  profile: ProfileData
  isEditing: boolean
  rolesText: string
  onChangeRolesText: (value: string) => void
  avatarSrc: string | null
  onSelectAvatarFile: (file: File | null) => void
}

const roleClasses = [
  'bg-tag-be-surface text-tag-be',
  'bg-tag-ai-surface text-tag-ai',
]

// 프로필 좌측 카드. 아바타·이름·관심 직무를 보여주고, 편집 모드에서는 사진 변경과 직무 입력을 받는다.
export function ProfileCard({
  profile,
  isEditing,
  rolesText,
  onChangeRolesText,
  avatarSrc,
  onSelectAvatarFile,
}: ProfileCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <aside className="profile-card mypage-enter" style={{ '--section-order': 1 } as React.CSSProperties}>
      <div className="flex items-center gap-2 text-caption font-semibold text-surface-default">
        <BriefcaseBusiness className="size-4" aria-hidden="true" />
        <span>Ait MEMBER</span>
      </div>

      <div className="relative mt-4">
        <div
          className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-ait-m bg-profile-avatar text-display font-bold text-action-primary"
          aria-label={`${profile.name} 프로필`}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="size-full object-cover" />
          ) : (
            profile.name.slice(0, 1)
          )}
        </div>

        {isEditing ? (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 rounded-b-ait-m bg-action-primary/80 py-2 text-caption font-semibold text-surface-default transition-colors ease-standard duration-(--duration-fast) hover:bg-action-primary"
            >
              <Camera className="size-4" aria-hidden="true" />
              사진 변경
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => onSelectAvatarFile(event.target.files?.[0] ?? null)}
            />
          </>
        ) : null}
      </div>

      <div className="mt-4 min-h-28">
        <h2 className="text-center text-h3 font-semibold text-surface-default">
          {profile.name}
        </h2>

        {isEditing ? (
          <Input
            className="mt-3"
            value={rolesText}
            onChange={(event) => onChangeRolesText(event.target.value)}
            placeholder="쉼표로 구분해서 입력하세요 (예: 백엔드 개발, 백엔드 개발 인턴)"
            aria-label="관심 직무"
          />
        ) : (
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
        )}
      </div>
    </aside>
  )
}

import { useState } from 'react'
import { ProfileCard } from '@/components/mypage/ProfileCard'
import { ProfileInfo } from '@/components/mypage/ProfileInfo'
import type { ProfileData } from '@/types/profile'

interface ProfileSectionProps {
  profile: ProfileData
  repositoryError?: string | null
  repositoryLoading?: boolean
  onRetryRepositories?: () => void
  onOpenDocuments: () => void
}

function toCommaText(values: string[]) {
  return values.join(', ')
}

function parseCommaText(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function ProfileSection({
  profile,
  repositoryError,
  repositoryLoading,
  onRetryRepositories,
  onOpenDocuments,
}: ProfileSectionProps) {
  const [savedProfile, setSavedProfile] = useState(profile)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(profile)
  const [skillsText, setSkillsText] = useState(() => toCommaText(profile.skills))
  const [rolesText, setRolesText] = useState(() => toCommaText(profile.roles))
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false)

  const selectAvatarFile = (file: File | null) => {
    if (!file) return
    setAvatarPreviewUrl(URL.createObjectURL(file))
    setIsAvatarRemoved(false)
  }

  const removeAvatar = () => {
    setAvatarPreviewUrl(null)
    setIsAvatarRemoved(true)
  }

  const startEditing = () => {
    setDraft(savedProfile)
    setSkillsText(toCommaText(savedProfile.skills))
    setRolesText(toCommaText(savedProfile.roles))
    setAvatarPreviewUrl(null)
    setIsAvatarRemoved(false)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setAvatarPreviewUrl(null)
    setIsAvatarRemoved(false)
    setIsEditing(false)
  }

  // TODO: 실제 API 연동 필요 - 프로필 수정 엔드포인트가 없어 화면에서만 반영한다.
  const saveEditing = () => {
    setSavedProfile({
      ...draft,
      skills: parseCommaText(skillsText),
      roles: parseCommaText(rolesText),
      avatarUrl: isAvatarRemoved ? null : (avatarPreviewUrl ?? draft.avatarUrl ?? null),
    })
    setAvatarPreviewUrl(null)
    setIsAvatarRemoved(false)
    setIsEditing(false)
  }

  const updateField = (key: 'nickname' | 'email' | 'github', value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const updateRepositoryName = (id: number, name: string) => {
    setDraft((current) => ({
      ...current,
      repositories: current.repositories.map((repository) =>
        repository.id === id ? { ...repository, name } : repository,
      ),
    }))
  }

  const displayed = isEditing ? draft : savedProfile
  const editingAvatarSrc = isAvatarRemoved ? null : (avatarPreviewUrl ?? draft.avatarUrl ?? null)

  return (
    <div className="profile-layout grid gap-8">
      <ProfileCard
        profile={displayed}
        isEditing={isEditing}
        rolesText={rolesText}
        onChangeRolesText={setRolesText}
        avatarSrc={isEditing ? editingAvatarSrc : (savedProfile.avatarUrl ?? null)}
        onSelectAvatarFile={selectAvatarFile}
        onRemoveAvatar={removeAvatar}
      />
      <ProfileInfo
        profile={displayed}
        isEditing={isEditing}
        skillsText={skillsText}
        onChangeSkillsText={setSkillsText}
        onChangeField={updateField}
        onChangeRepositoryName={updateRepositoryName}
        repositoryError={repositoryError}
        repositoryLoading={repositoryLoading}
        onRetryRepositories={onRetryRepositories}
        onOpenDocuments={onOpenDocuments}
        onStartEditing={startEditing}
        onCancelEditing={cancelEditing}
        onSaveEditing={saveEditing}
      />
    </div>
  )
}

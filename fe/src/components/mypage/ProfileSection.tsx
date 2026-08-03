import { useState } from 'react'
import { deleteGithubRepo, updateGithubRepoNickname } from '@/api/github'
import { toErrorMessage } from '@/api/http'
import { AccountDeletionSection } from '@/components/mypage/AccountDeletionSection'
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
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [draft, setDraft] = useState(profile)
  const [skillsText, setSkillsText] = useState(() => toCommaText(profile.skills))
  const [rolesText, setRolesText] = useState(() => toCommaText(profile.roles))

  // TODO: 실제 API 연동 필요 - 사진 업로드 엔드포인트가 없어 편집 모드와 무관하게 화면에서만 즉시 반영한다.
  const updateAvatarUrl = (avatarUrl: string | null) => {
    setSavedProfile((current) => ({ ...current, avatarUrl }))
    setDraft((current) => ({ ...current, avatarUrl }))
  }

  const selectAvatarFile = (file: File | null) => {
    if (!file) return
    updateAvatarUrl(URL.createObjectURL(file))
  }

  const removeAvatar = () => {
    updateAvatarUrl(null)
  }

  const startEditing = () => {
    setDraft(savedProfile)
    setSkillsText(toCommaText(savedProfile.skills))
    setRolesText(toCommaText(savedProfile.roles))
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setSaveError(null)
    setIsEditing(false)
  }

  // TODO: 실제 API 연동 필요 - 닉네임 등 프로필 필드는 수정 엔드포인트가 없어 화면에서만 반영한다.
  const saveEditing = async () => {
    // 표시 이름이 실제로 바뀐 레포지토리만 서버에 저장한다. 빈 이름은 기존 이름을 유지한다.
    const renamedRepositories = draft.repositories.filter((repository) => {
      const saved = savedProfile.repositories.find((item) => item.id === repository.id)
      const name = repository.name.trim()
      return Boolean(saved && name && name !== saved.name)
    })

    setIsSaving(true)
    setSaveError(null)
    try {
      await Promise.all(
        renamedRepositories.map((repository) =>
          updateGithubRepoNickname(repository.id, repository.name.trim()),
        ),
      )
    } catch (error) {
      setSaveError(toErrorMessage(error))
      setIsSaving(false)
      return
    }

    setSavedProfile({
      ...draft,
      repositories: draft.repositories.map((repository) => {
        const saved = savedProfile.repositories.find((item) => item.id === repository.id)
        const name = repository.name.trim()
        return { ...repository, name: name || saved?.name || repository.name }
      }),
      skills: parseCommaText(skillsText),
      roles: parseCommaText(rolesText),
    })
    setIsSaving(false)
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

  // 서버에서 연동을 삭제한 뒤 저장본과 편집본 양쪽에서 해당 레포지토리를 제거한다.
  const deleteRepository = async (id: number) => {
    await deleteGithubRepo(id)
    const removeRepository = (current: ProfileData): ProfileData => ({
      ...current,
      repositories: current.repositories.filter((repository) => repository.id !== id),
    })
    setSavedProfile(removeRepository)
    setDraft(removeRepository)
  }

  const displayed = isEditing ? draft : savedProfile

  return (
    <div className="profile-layout grid gap-8">
      <div className="flex flex-col self-start">
        <ProfileCard
          profile={displayed}
          isEditing={isEditing}
          rolesText={rolesText}
          onChangeRolesText={setRolesText}
          avatarSrc={displayed.avatarUrl ?? null}
          onSelectAvatarFile={selectAvatarFile}
          onRemoveAvatar={removeAvatar}
        />
        {isEditing ? (
          <div className="mt-auto flex justify-start pt-4">
            <AccountDeletionSection />
          </div>
        ) : null}
      </div>
      <ProfileInfo
        profile={displayed}
        isEditing={isEditing}
        skillsText={skillsText}
        onChangeSkillsText={setSkillsText}
        onChangeField={updateField}
        onChangeRepositoryName={updateRepositoryName}
        isSaving={isSaving}
        saveError={saveError}
        repositoryError={repositoryError}
        repositoryLoading={repositoryLoading}
        onRetryRepositories={onRetryRepositories}
        onDeleteRepository={deleteRepository}
        onOpenDocuments={onOpenDocuments}
        onStartEditing={startEditing}
        onCancelEditing={cancelEditing}
        onSaveEditing={saveEditing}
      />
    </div>
  )
}

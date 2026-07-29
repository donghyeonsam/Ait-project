import { useState } from 'react'
import {
  deleteGithubRepository,
  updateGithubRepositoryNickname,
} from '@/api/github'
import { toErrorMessage } from '@/api/http'
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
  const [isSaving, setIsSaving] = useState(false)
  const [deletingRepositoryId, setDeletingRepositoryId] = useState<
    number | null
  >(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

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
    setMutationError(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setAvatarPreviewUrl(null)
    setIsAvatarRemoved(false)
    setIsEditing(false)
  }

  const saveEditing = async () => {
    const changedRepositories = draft.repositories.filter((repository) => {
      const savedRepository = savedProfile.repositories.find(
        (item) => item.id === repository.id,
      )
      return savedRepository && savedRepository.name !== repository.name
    })
    if (changedRepositories.some((repository) => !repository.name.trim())) {
      setMutationError('레포지토리 표시 이름을 입력해주세요.')
      return
    }

    setIsSaving(true)
    setMutationError(null)
    try {
      await Promise.all(
        changedRepositories.map((repository) =>
          updateGithubRepositoryNickname(
            repository.id,
            repository.name.trim(),
          ),
        ),
      )
      setSavedProfile({
        ...draft,
        repositories: draft.repositories.map((repository) => ({
          ...repository,
          name: repository.name.trim(),
        })),
        skills: parseCommaText(skillsText),
        roles: parseCommaText(rolesText),
        avatarUrl: isAvatarRemoved
          ? null
          : (avatarPreviewUrl ?? draft.avatarUrl ?? null),
      })
      setAvatarPreviewUrl(null)
      setIsAvatarRemoved(false)
      setIsEditing(false)
    } catch (error) {
      setMutationError(toErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteRepository = async (repositoryId: number) => {
    setDeletingRepositoryId(repositoryId)
    setMutationError(null)
    try {
      await deleteGithubRepository(repositoryId)
      setSavedProfile((current) => ({
        ...current,
        repositories: current.repositories.filter(
          (repository) => repository.id !== repositoryId,
        ),
      }))
      setDraft((current) => ({
        ...current,
        repositories: current.repositories.filter(
          (repository) => repository.id !== repositoryId,
        ),
      }))
    } catch (error) {
      setMutationError(toErrorMessage(error))
      throw error
    } finally {
      setDeletingRepositoryId(null)
    }
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
        repositoryMutationError={mutationError}
        deletingRepositoryId={deletingRepositoryId}
        onDeleteRepository={deleteRepository}
        onOpenDocuments={onOpenDocuments}
        onStartEditing={startEditing}
        onCancelEditing={cancelEditing}
        onSaveEditing={() => void saveEditing()}
        isSaving={isSaving}
      />
    </div>
  )
}

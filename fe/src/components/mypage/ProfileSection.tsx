import { useEffect, useState } from 'react'
import { deleteGithubRepo } from '@/api/github'
import { ApiError, getBackendAssetUrl, toErrorMessage } from '@/api/http'
import { checkNicknameAvailability, updateMyPageProfile } from '@/api/my-page'
import { AccountDeletionSection } from '@/components/mypage/AccountDeletionSection'
import { PasswordChangeSection } from '@/components/mypage/PasswordChangeSection'
import { ProfileCard } from '@/components/mypage/ProfileCard'
import { ProfileInfo } from '@/components/mypage/ProfileInfo'
import type { ProfileData } from '@/types/profile'

interface ProfileSectionProps {
  profile: ProfileData
  repositoryError?: string | null
  repositoryLoading?: boolean
  onRetryRepositories?: () => void
  onRepositoryInstalled?: () => void
  onOpenDocuments: () => void
}

const nicknameMaxLength = 20
const nicknameCheckDebounceMs = 400
const rolesMaxCount = 2
// ErrorCode.DUPLICATE_NICKNAME("AUTH_002")와 매칭. be/global/exception/ErrorCode.java 참고.
const duplicateNicknameErrorCode = 'AUTH_002'

function toCommaText(values: string[]) {
  return values.join(', ')
}

function parseCommaText(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

// 관심 직무는 서버에 첫 번째·두 번째 두 슬롯으로만 저장된다.
function toJobInterests(roles: string[]) {
  return {
    firstJobInterest: roles[0] ?? null,
    secondJobInterest: roles[1] ?? null,
  }
}

function validateRolesFormat(value: string) {
  if (parseCommaText(value).length > rolesMaxCount) {
    return `관심 직무는 최대 ${rolesMaxCount}개까지 입력할 수 있습니다.`
  }
  return null
}

function validateNicknameFormat(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return '닉네임을 입력해주세요.'
  if (trimmed.length > nicknameMaxLength) return `닉네임은 ${nicknameMaxLength}자 이하여야 합니다.`
  return null
}

function isDuplicateNicknameError(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 409) return false
  const payload = error.payload as { error?: { code?: string } } | null
  return payload?.error?.code === duplicateNicknameErrorCode
}

export function ProfileSection({
  profile,
  repositoryError,
  repositoryLoading,
  onRetryRepositories,
  onRepositoryInstalled,
  onOpenDocuments,
}: ProfileSectionProps) {
  const [savedProfile, setSavedProfile] = useState(profile)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [isCheckingNickname, setIsCheckingNickname] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [draft, setDraft] = useState(profile)
  const [skillsText, setSkillsText] = useState(() => toCommaText(profile.skills))
  const [rolesText, setRolesText] = useState(() => toCommaText(profile.roles))
  const [rolesError, setRolesError] = useState<string | null>(null)

  // 형식(빈 값·길이)과 "저장된 닉네임과 동일" 여부는 입력 즉시 updateField에서 걸러지고,
  // 형식이 유효하고 실제로 값이 바뀐 경우에만 여기서 서버에 중복 여부를 debounce로 물어본다.
  // 저장된 닉네임 그대로면 건너뛰는데, 중복확인 API가 자기 자신을 제외하지 않아
  // 안 바꾼 경우까지 물어보면 항상 "사용 불가"로 나오기 때문이다.
  useEffect(() => {
    if (!isEditing) return

    const nickname = draft.nickname.trim()
    if (validateNicknameFormat(nickname)) return
    if (nickname === savedProfile.nickname) return

    let cancelled = false
    const timer = window.setTimeout(() => {
      setIsCheckingNickname(true)
      checkNicknameAvailability(nickname)
        .then((result) => {
          if (cancelled) return
          setNicknameError(result.canUse ? null : '이미 사용 중인 닉네임입니다.')
        })
        .catch(() => {
          // 중복확인 조회 실패는 조용히 넘어가고, 저장 시점의 서버 검증에 맡긴다.
        })
        .finally(() => {
          if (!cancelled) setIsCheckingNickname(false)
        })
    }, nicknameCheckDebounceMs)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [draft.nickname, isEditing, savedProfile.nickname])

  const updateAvatarUrl = (avatarUrl: string | null) => {
    setSavedProfile((current) => ({ ...current, avatarUrl }))
    setDraft((current) => ({ ...current, avatarUrl }))
  }

  // 사진 변경은 "수정하기" 흐름과 무관하게 고르는 즉시 반영·저장된다. 통합 수정 API가
  // 이미지만 따로 올리는 엔드포인트가 없어, 현재 저장된 값(draft가 아닌 savedProfile) 그대로
  // 다시 보내면서 이미지만 새로 첨부한다 — 편집 중이던 미저장 값이 섞여 들어가지 않게 하기 위해서다.
  const selectAvatarFile = async (file: File | null) => {
    if (!file) return

    const previousAvatarUrl = savedProfile.avatarUrl ?? null
    const previewUrl = URL.createObjectURL(file)
    updateAvatarUrl(previewUrl)
    setIsUploadingAvatar(true)
    setAvatarError(null)

    try {
      const response = await updateMyPageProfile(
        {
          nickname: savedProfile.nickname,
          name: savedProfile.name,
          ...toJobInterests(savedProfile.roles),
          skills: savedProfile.skills,
          githubRepositories: savedProfile.repositories.map((repository) => ({
            githubRepoId: repository.id,
            repoNickname: repository.name,
          })),
        },
        file,
      )
      updateAvatarUrl(
        response.profileImageUrl ? getBackendAssetUrl(response.profileImageUrl) : null,
      )
    } catch (error) {
      updateAvatarUrl(previousAvatarUrl)
      setAvatarError(toErrorMessage(error))
    } finally {
      URL.revokeObjectURL(previewUrl)
      setIsUploadingAvatar(false)
    }
  }

  // 백엔드에 사진 삭제 기능이 없어(업로드 시 교체만 지원) 화면에서만 지운다.
  // 다음 저장이나 새로고침 시 서버에 남아있는 기존 사진으로 되돌아올 수 있다.
  const removeAvatar = () => {
    updateAvatarUrl(null)
  }

  const startEditing = () => {
    setDraft(savedProfile)
    setSkillsText(toCommaText(savedProfile.skills))
    setRolesText(toCommaText(savedProfile.roles))
    setNicknameError(null)
    setRolesError(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setDraft(savedProfile)
    setSkillsText(toCommaText(savedProfile.skills))
    setRolesText(toCommaText(savedProfile.roles))
    setSaveError(null)
    setNicknameError(null)
    setRolesError(null)
    setIsEditing(false)
  }

  const changeRolesText = (value: string) => {
    setRolesText(value)
    setRolesError(validateRolesFormat(value))
  }

  // 닉네임·이름·관심 기술·깃허브 레포지토리 별칭을 한 번에 저장한다.
  const saveEditing = async () => {
    const formatError = validateNicknameFormat(draft.nickname)
    if (formatError) {
      setNicknameError(formatError)
      return
    }

    const rolesFormatError = validateRolesFormat(rolesText)
    if (rolesFormatError) {
      setRolesError(rolesFormatError)
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setNicknameError(null)
    setRolesError(null)

    try {
      await updateMyPageProfile({
        nickname: draft.nickname.trim(),
        name: draft.name.trim(),
        ...toJobInterests(parseCommaText(rolesText)),
        skills: parseCommaText(skillsText),
        githubRepositories: draft.repositories
          .filter((repository) => repository.name.trim())
          .map((repository) => ({
            githubRepoId: repository.id,
            repoNickname: repository.name.trim(),
          })),
      })
    } catch (error) {
      if (isDuplicateNicknameError(error)) {
        setNicknameError(toErrorMessage(error))
      } else {
        setSaveError(toErrorMessage(error))
      }
      setIsSaving(false)
      return
    }

    setSavedProfile({
      ...draft,
      name: draft.name.trim() || savedProfile.name,
      nickname: draft.nickname.trim(),
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

  const updateField = (key: 'name' | 'nickname' | 'email' | 'github', value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
    if (key === 'nickname') setNicknameError(validateNicknameFormat(value))
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
          onChangeRolesText={changeRolesText}
          rolesError={rolesError}
          onChangeName={(value) => updateField('name', value)}
          avatarSrc={displayed.avatarUrl ?? null}
          onSelectAvatarFile={(file) => void selectAvatarFile(file)}
          onRemoveAvatar={removeAvatar}
          isUploadingAvatar={isUploadingAvatar}
          avatarError={avatarError}
        />
        {isEditing ? (
          <div className="mt-auto flex flex-col items-start gap-2 pt-4">
            <PasswordChangeSection />
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
        nicknameError={nicknameError}
        isCheckingNickname={isCheckingNickname}
        hasRolesError={Boolean(rolesError)}
        onChangeRepositoryName={updateRepositoryName}
        isSaving={isSaving}
        saveError={saveError}
        repositoryError={repositoryError}
        repositoryLoading={repositoryLoading}
        onRetryRepositories={onRetryRepositories}
        onRepositoryInstalled={onRepositoryInstalled}
        onDeleteRepository={deleteRepository}
        onOpenDocuments={onOpenDocuments}
        onStartEditing={startEditing}
        onCancelEditing={cancelEditing}
        onSaveEditing={() => void saveEditing()}
      />
    </div>
  )
}

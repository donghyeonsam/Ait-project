import { FilePenLine, Pencil } from 'lucide-react'
import { RepoAccordion } from '@/components/mypage/RepoAccordion'
import { SkillTags } from '@/components/mypage/SkillTags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProfileData } from '@/types/profile'

interface ProfileInfoProps {
  profile: ProfileData
  isEditing: boolean
  skillsText: string
  onChangeSkillsText: (value: string) => void
  onChangeField: (key: 'nickname' | 'email' | 'github', value: string) => void
  nicknameError?: string | null
  isCheckingNickname?: boolean
  hasRolesError?: boolean
  onChangeRepositoryName: (id: number, name: string) => void
  isSaving?: boolean
  saveError?: string | null
  repositoryLoading?: boolean
  onRepositoryInstalled?: () => void
  onOpenDocuments: () => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onSaveEditing: () => void
}

const profileFields = [
  { key: 'nickname', label: '닉네임' },
  { key: 'email', label: '이메일' },
  { key: 'github', label: '깃허브' },
] as const

// 프로필 우측 상세. 닉네임·이메일·깃허브와 레포지토리·기술 목록을 보여주고 편집/저장을 처리한다.
export function ProfileInfo({
  profile,
  isEditing,
  skillsText,
  onChangeSkillsText,
  onChangeField,
  nicknameError,
  isCheckingNickname = false,
  hasRolesError = false,
  onChangeRepositoryName,
  isSaving = false,
  saveError,
  repositoryLoading,
  onRepositoryInstalled,
  onOpenDocuments,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
}: ProfileInfoProps) {
  return (
    <div className="min-w-0 flex-1">
      <dl className="grid min-h-40 gap-3">
        {profileFields.map((field) => (
          <div key={field.key} className="grid items-start gap-2 sm:grid-cols-[7rem_1fr]">
            <dt className="pt-2 text-body-2 font-semibold text-text-primary">{field.label}</dt>
            {isEditing ? (
              <div>
                <Input
                  value={profile[field.key]}
                  disabled={isSaving}
                  onChange={(event) => onChangeField(field.key, event.target.value)}
                  aria-label={field.label}
                  aria-invalid={field.key === 'nickname' && Boolean(nicknameError)}
                />
                {field.key === 'nickname' && nicknameError ? (
                  <p className="mt-1 text-caption text-status-error" role="alert">
                    {nicknameError}
                  </p>
                ) : field.key === 'nickname' && isCheckingNickname ? (
                  <p className="mt-1 text-caption text-text-secondary" role="status">
                    닉네임 확인 중...
                  </p>
                ) : null}
              </div>
            ) : (
              <dd className="pt-2 text-body-2 text-text-secondary">
                {profile[field.key] || '미등록'}
              </dd>
            )}
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-4">
        {isEditing ? (
          <div className="border-t border-border-default pt-4">
            <h3 className="text-body-2 font-semibold text-action-primary">등록 레포지토리 표시 이름</h3>
            <ul className="mt-3 space-y-2">
              {profile.repositories.length ? profile.repositories.map((repository) => (
                <li key={repository.id}>
                  <Input
                    value={repository.name}
                    disabled={isSaving}
                    onChange={(event) => onChangeRepositoryName(repository.id, event.target.value)}
                    aria-label={`${repository.name} 표시 이름`}
                  />
                </li>
              )) : (
                <li className="text-caption text-text-secondary">등록된 레포지토리가 없습니다.</li>
              )}
            </ul>
          </div>
        ) : (
          <RepoAccordion
            repositories={profile.repositories}
            loading={repositoryLoading}
            onInstalled={onRepositoryInstalled}
          />
        )}

        {isEditing ? (
          <div className="border-t border-border-default pt-4">
            <h3 className="text-body-2 font-semibold text-action-primary">프로젝트 사용 기술</h3>
            <Input
              className="mt-3"
              value={skillsText}
              disabled={isSaving}
              onChange={(event) => onChangeSkillsText(event.target.value)}
              placeholder="쉼표로 구분해서 입력하세요 (예: Java, Spring Boot, MySQL)"
              aria-label="프로젝트 사용 기술"
            />
          </div>
        ) : (
          <SkillTags skills={profile.skills} />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border-default pt-4">
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5 text-caption [&_svg]:size-4"
          disabled={isEditing}
          onClick={onOpenDocuments}
        >
          <FilePenLine aria-hidden="true" />
          서류함
        </Button>
        {isEditing ? (
          <div className="ml-auto flex items-center gap-3">
            {saveError ? (
              <p className="text-caption text-status-error" role="alert">
                {saveError}
              </p>
            ) : null}
            <Button type="button" variant="text" disabled={isSaving} onClick={onCancelEditing}>
              취소
            </Button>
            <Button
              type="button"
              disabled={isSaving || isCheckingNickname || Boolean(nicknameError) || hasRolesError}
              onClick={onSaveEditing}
            >
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="ml-auto px-3 py-1.5 text-caption [&_svg]:size-4"
            onClick={onStartEditing}
          >
            <Pencil aria-hidden="true" />
            수정하기
          </Button>
        )}
      </div>
    </div>
  )
}

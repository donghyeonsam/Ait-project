import { Check, FilePenLine, FileText, Pencil, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RepoAccordion } from '@/components/mypage/RepoAccordion'
import { SkillTags } from '@/components/mypage/SkillTags'
import type { ProfileData } from '@/mocks/mypage'

interface ProfileInfoProps {
  profile: ProfileData
  isEditing: boolean
  skillsInput: string
  onChange: (profile: ProfileData) => void
  onSkillsInputChange: (value: string) => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onOpenResume: () => void
  onOpenCoverLetter: () => void
}

const profileFields = [
  { key: 'nickname', label: '닉네임' },
  { key: 'email', label: '이메일' },
  { key: 'github', label: '깃허브' },
] as const

export function ProfileInfo({
  profile,
  isEditing,
  skillsInput,
  onChange,
  onSkillsInputChange,
  onEdit,
  onSave,
  onCancel,
  onOpenResume,
  onOpenCoverLetter,
}: ProfileInfoProps) {
  return (
    <div className="min-w-0 flex-1">
      <div
        key={isEditing ? 'info-edit' : 'info-view'}
        className="profile-crossfade grid min-h-40 gap-3"
      >
        {profileFields.map((field) => (
          <div
            key={field.key}
            className="grid items-center gap-2 sm:grid-cols-[7rem_1fr]"
          >
            <label
              htmlFor={`profile-${field.key}`}
              className="text-body-2 font-semibold text-text-primary"
            >
              {field.label}
            </label>
            {isEditing ? (
              <Input
                id={`profile-${field.key}`}
                type={field.key === 'email' ? 'email' : 'text'}
                value={profile[field.key]}
                onChange={(event) =>
                  onChange({ ...profile, [field.key]: event.target.value })
                }
              />
            ) : (
              <p id={`profile-${field.key}`} className="text-body-2 text-text-secondary">
                {profile[field.key]}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        <RepoAccordion
          repositories={profile.repositories}
          isEditing={isEditing}
          onNameChange={(id, name) =>
            onChange({
              ...profile,
              repositories: profile.repositories.map((repository) =>
                repository.id === id ? { ...repository, name } : repository,
              ),
            })
          }
        />
        <SkillTags
          skills={profile.skills}
          isEditing={isEditing}
          inputValue={skillsInput}
          onInputChange={onSkillsInputChange}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border-default pt-4">
        <Button type="button" variant="secondary" onClick={onOpenResume}>
          <FileText aria-hidden="true" />
          이력서
        </Button>
        <Button type="button" variant="secondary" onClick={onOpenCoverLetter}>
          <FilePenLine aria-hidden="true" />
          자소서
        </Button>

        <div className="ml-auto flex gap-3">
          {isEditing ? (
            <>
              <Button type="button" variant="secondary" onClick={onCancel}>
                <RotateCcw aria-hidden="true" />
                취소
              </Button>
              <Button type="button" onClick={onSave}>
                <Check aria-hidden="true" />
                저장
              </Button>
            </>
          ) : (
            <Button type="button" onClick={onEdit}>
              <Pencil aria-hidden="true" />
              내 정보 수정
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}


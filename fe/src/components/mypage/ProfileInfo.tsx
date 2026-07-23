import { FilePenLine, FileText } from 'lucide-react'
import { RepoAccordion } from '@/components/mypage/RepoAccordion'
import { SkillTags } from '@/components/mypage/SkillTags'
import { Button } from '@/components/ui/button'
import type { ProfileData } from '@/types/profile'

interface ProfileInfoProps {
  profile: ProfileData
  repositoryError?: string | null
  repositoryLoading?: boolean
  onRetryRepositories?: () => void
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
  repositoryError,
  repositoryLoading,
  onRetryRepositories,
  onOpenResume,
  onOpenCoverLetter,
}: ProfileInfoProps) {
  return (
    <div className="min-w-0 flex-1">
      <dl className="grid min-h-40 gap-3">
        {profileFields.map((field) => (
          <div key={field.key} className="grid items-center gap-2 sm:grid-cols-[7rem_1fr]">
            <dt className="text-body-2 font-semibold text-text-primary">{field.label}</dt>
            <dd className="text-body-2 text-text-secondary">
              {profile[field.key] || '미등록'}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-4">
        <RepoAccordion
          repositories={profile.repositories}
          error={repositoryError}
          loading={repositoryLoading}
          onRetry={onRetryRepositories}
        />
        <SkillTags skills={profile.skills} />
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
        <p className="ml-auto text-caption text-text-secondary">
          기본 정보는 서버에 저장된 값을 표시합니다.
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ActivityTabs } from '@/components/mypage/ActivityTabs'
import { CoverLetterModal } from '@/components/mypage/CoverLetterModal'
import { ProfileCard } from '@/components/mypage/ProfileCard'
import { ProfileInfo } from '@/components/mypage/ProfileInfo'
import { ResumeModal } from '@/components/mypage/ResumeModal'
import { PageLayout } from '@/components/layout/PageLayout'
import { initialProfile, type ProfileData } from '@/mocks/mypage'

function cloneProfile(profile: ProfileData): ProfileData {
  return {
    ...profile,
    roles: [...profile.roles],
    repositories: profile.repositories.map((repository) => ({ ...repository })),
    skills: [...profile.skills],
  }
}

export function MyPage() {
  const [profile, setProfile] = useState(() => cloneProfile(initialProfile))
  const [draft, setDraft] = useState(() => cloneProfile(initialProfile))
  const [skillsInput, setSkillsInput] = useState(initialProfile.skills.join(', '))
  const [isEditing, setIsEditing] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [coverLetterOpen, setCoverLetterOpen] = useState(false)

  const startEditing = () => {
    const nextDraft = cloneProfile(profile)
    setDraft(nextDraft)
    setSkillsInput(nextDraft.skills.join(', '))
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setDraft(cloneProfile(profile))
    setSkillsInput(profile.skills.join(', '))
    setIsEditing(false)
  }

  const saveProfile = () => {
    const skills = skillsInput
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean)
    const nextProfile = { ...cloneProfile(draft), skills }
    setProfile(nextProfile)
    setDraft(cloneProfile(nextProfile))
    setSkillsInput(skills.join(', '))
    setIsEditing(false)
  }

  const currentProfile = isEditing ? draft : profile

  return (
    <PageLayout>
      <section className="pb-10 pt-10" aria-labelledby="mypage-title">
        <h1 id="mypage-title" className="text-h1 text-action-primary">
          마이페이지
        </h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          프로필과 활동 내역을 한눈에 관리하세요.
        </p>
      </section>

      <section
        className="mypage-panel mypage-enter"
        style={{ '--section-order': 0 } as React.CSSProperties}
        aria-labelledby="profile-section-title"
      >
        <h2 id="profile-section-title" className="sr-only">내 정보</h2>
        <div className="profile-layout grid gap-8">
          <ProfileCard profile={currentProfile} isEditing={isEditing} onChange={setDraft} />
          <ProfileInfo
            profile={currentProfile}
            isEditing={isEditing}
            skillsInput={skillsInput}
            onChange={setDraft}
            onSkillsInputChange={setSkillsInput}
            onEdit={startEditing}
            onSave={saveProfile}
            onCancel={cancelEditing}
            onOpenResume={() => setResumeOpen(true)}
            onOpenCoverLetter={() => setCoverLetterOpen(true)}
          />
        </div>
      </section>

      <div className="py-10">
        <ActivityTabs />
      </div>

      <ResumeModal open={resumeOpen} onOpenChange={setResumeOpen} />
      <CoverLetterModal open={coverLetterOpen} onOpenChange={setCoverLetterOpen} />
    </PageLayout>
  )
}


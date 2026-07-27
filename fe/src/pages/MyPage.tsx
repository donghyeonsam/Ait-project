import { useEffect, useMemo, useState } from 'react'
import { getMyGithubRepositories, type GithubRepository } from '@/api/github'
import { toErrorMessage } from '@/api/http'
import { getMyPageData } from '@/api/my-page'
import type { Resume } from '@/api/resume'
import { DocumentBoxDialog } from '@/components/documents/DocumentBoxDialog'
import { PageLayout } from '@/components/layout/PageLayout'
import { ActivityTabs } from '@/components/mypage/ActivityTabs'
import { ProfileSection } from '@/components/mypage/ProfileSection'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/useAuth'
import type { ProfileData } from '@/types/profile'

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function githubProfile(repositories: GithubRepository[]) {
  const repository = repositories[0]
  if (!repository) return ''

  try {
    const url = new URL(repository.url)
    const owner = url.pathname.split('/').filter(Boolean)[0]
    return owner ? `${url.hostname}/${owner}` : ''
  } catch {
    return ''
  }
}

function createProfile(
  resume: Resume | null,
  repositories: GithubRepository[],
  nickname: string,
  email: string,
): ProfileData {
  const roles = resume
    ? unique([
        ...resume.projects.map((project) => project.role),
        ...resume.careers.map((career) => career.role),
      ])
    : []
  const skills = resume
    ? unique(resume.projects.flatMap((project) => project.techStacks.split(',')))
    : []

  return {
    name: resume?.userName || nickname,
    nickname,
    email,
    github: githubProfile(repositories),
    roles,
    repositories: repositories.map((repository) => ({
      id: repository.githubRepoId,
      name: repository.nickname || repository.name,
      url: repository.url,
    })),
    skills,
  }
}

export function MyPage() {
  const { user } = useAuth()
  const [resume, setResume] = useState<Resume | null>(null)
  const [repositories, setRepositories] = useState<GithubRepository[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [repositoryError, setRepositoryError] = useState<string | null>(null)
  const [isRepositoryLoading, setIsRepositoryLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [documentBoxOpen, setDocumentBoxOpen] = useState(false)

  useEffect(() => {
    let active = true

    getMyPageData()
      .then((data) => {
        if (!active) return
        setResume(data.resume)
        setRepositories(data.repositories)
        setRepositoryError(data.repositoryError)
      })
      .catch((requestError: unknown) => {
        if (active) setError(toErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const retry = () => {
    setIsLoading(true)
    setError(null)
    setRepositoryError(null)
    getMyPageData()
      .then((data) => {
        setResume(data.resume)
        setRepositories(data.repositories)
        setRepositoryError(data.repositoryError)
      })
      .catch((requestError: unknown) => setError(toErrorMessage(requestError)))
      .finally(() => setIsLoading(false))
  }

  const retryRepositories = () => {
    setIsRepositoryLoading(true)
    setRepositoryError(null)
    getMyGithubRepositories()
      .then(setRepositories)
      .catch((requestError: unknown) => {
        setRepositoryError(toErrorMessage(requestError))
      })
      .finally(() => setIsRepositoryLoading(false))
  }

  const profile = useMemo(() => {
    if (!repositories || !user) return null
    return createProfile(resume, repositories, user.nickname, user.email)
  }, [repositories, resume, user])

  return (
    <PageLayout>
      <section className="pb-10 pt-10" aria-labelledby="mypage-title">
        <h1 id="mypage-title" className="text-h1 text-action-primary">마이페이지</h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          프로필과 등록된 면접 자료를 한눈에 확인하세요.
        </p>
      </section>

      {isLoading ? (
        <section className="mypage-panel py-16 text-center" role="status">
          <p className="text-body-1 text-text-secondary">
            {user?.nickname ?? '사용자'}님의 정보를 불러오는 중입니다.
          </p>
        </section>
      ) : error ? (
        <section className="mypage-panel py-16 text-center" role="alert">
          <p className="text-body-1 text-status-error">{error}</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={retry}>
            다시 시도
          </Button>
        </section>
      ) : profile ? (
        <>
          <section
            className="mypage-panel mypage-enter"
            style={{ '--section-order': 0 } as React.CSSProperties}
            aria-labelledby="profile-section-title"
          >
            <h2 id="profile-section-title" className="sr-only">내 정보</h2>
            <ProfileSection
              profile={profile}
              repositoryError={repositoryError}
              repositoryLoading={isRepositoryLoading}
              onRetryRepositories={retryRepositories}
              onOpenDocuments={() => setDocumentBoxOpen(true)}
            />
          </section>

          <div className="py-10">
            <ActivityTabs />
          </div>

          {documentBoxOpen ? (
            <DocumentBoxDialog open onOpenChange={setDocumentBoxOpen} />
          ) : null}
        </>
      ) : null}
    </PageLayout>
  )
}

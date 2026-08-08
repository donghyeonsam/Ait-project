import { useEffect, useMemo, useState } from 'react'
import { getProfileImageUrl, toErrorMessage } from '@/api/http'
import {
  getMyPageProfile,
  type MyPageGithubRepository,
  type MyPageProfile,
} from '@/api/my-page'
import { DocumentBoxDialog } from '@/components/documents/DocumentBoxDialog'
import { PageLayout } from '@/components/layout/PageLayout'
import { ActivityTabs } from '@/components/mypage/ActivityTabs'
import { ProfileSection } from '@/components/mypage/ProfileSection'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/useAuth'
import type { ProfileData } from '@/types/profile'

// 첫 저장소 URL에서 "호스트/소유자" 형태의 GitHub 프로필 경로를 뽑아낸다. 파싱 실패 시 빈 문자열.
function githubProfile(repositories: MyPageGithubRepository[]) {
  const repository = repositories[0]
  if (!repository) return ''

  try {
    const url = new URL(repository.repoUrl)
    const owner = url.pathname.split('/').filter(Boolean)[0]
    return owner ? `${url.hostname}/${owner}` : ''
  } catch {
    return ''
  }
}

// 계정 정보를 화면용 ProfileData 하나로 합친다. 저장소 목록도 내 정보 조회 응답을 그대로 쓰는데,
// githubRepoId가 여기서만 저장 요청에 그대로 되돌려 보낼 수 있는 내부 식별자이기 때문이다
// (GitHub 저장소 목록 API의 githubRepoId는 GitHub 자체 repo id라 값이 다르다).
function createProfile(profileInfo: MyPageProfile): ProfileData {
  const roles = [profileInfo.firstJobInterest, profileInfo.secondJobInterest].filter(
    (value): value is string => Boolean(value?.trim()),
  )

  return {
    name: profileInfo.name,
    nickname: profileInfo.nickname,
    email: profileInfo.email,
    github: githubProfile(profileInfo.githubRepositories),
    roles,
    repositories: profileInfo.githubRepositories.map((repository) => ({
      id: repository.githubRepoId,
      name: repository.repoNickname,
      url: repository.repoUrl,
    })),
    skills: profileInfo.skills,
    avatarUrl: profileInfo.profileImageUrl
      ? getProfileImageUrl(profileInfo.profileImageUrl)
      : null,
  }
}

// 마이페이지. 프로필과 등록 자료를 불러와 보여주고, 저장소 조회는 별도로 재시도할 수 있다.
export function MyPage() {
  const { user } = useAuth()
  const [profileInfo, setProfileInfo] = useState<MyPageProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRepositoryLoading, setIsRepositoryLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [documentBoxOpen, setDocumentBoxOpen] = useState(false)

  useEffect(() => {
    let active = true

    getMyPageProfile()
      .then((profile) => {
        if (active) setProfileInfo(profile)
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
    getMyPageProfile()
      .then(setProfileInfo)
      .catch((requestError: unknown) => setError(toErrorMessage(requestError)))
      .finally(() => setIsLoading(false))
  }

  // 연동 확인 후 저장소 목록을 다시 불러온다. 실패해도 이전 목록을 그대로 유지한다.
  const retryRepositories = () => {
    setIsRepositoryLoading(true)
    getMyPageProfile()
      .then(setProfileInfo)
      .catch(() => {})
      .finally(() => setIsRepositoryLoading(false))
  }

  const profile = useMemo(() => {
    if (!profileInfo) return null
    return createProfile(profileInfo)
  }, [profileInfo])

  return (
    <PageLayout>
      <section className="pb-10 pt-10" aria-labelledby="mypage-title">
        <h1 id="mypage-title" className="text-h1 text-action-primary">마이페이지</h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          프로필과 등록된 면접 자료를 한눈에 확인하세요.
        </p>
      </section>

      {isLoading ? (
        <section
          className="mypage-panel profile-layout grid gap-8"
          role="status"
          aria-label={`${user?.nickname ?? '사용자'}님의 정보를 불러오는 중`}
        >
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
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
              repositoryLoading={isRepositoryLoading}
              onRepositoryInstalled={retryRepositories}
              onOpenDocuments={() => setDocumentBoxOpen(true)}
            />
          </section>

          <div className="py-10">
            <ActivityTabs />
          </div>

          {/* 닫힘 애니메이션이 끝나기 전에 언마운트되지 않도록 조건부 렌더링 대신 open prop으로 제어한다. */}
          <DocumentBoxDialog open={documentBoxOpen} onOpenChange={setDocumentBoxOpen} />
        </>
      ) : null}
    </PageLayout>
  )
}

import { getMyGithubRepositories } from '@/api/github'
import { toErrorMessage } from '@/api/http'
import { getMyResume } from '@/api/resume'

// 마이페이지에 필요한 이력서와 저장소를 함께 조회한다.
// 이력서 조회 실패는 전체 실패로 던지고, 저장소 조회 실패는 repositoryError로 넘겨 부분 렌더링을 허용한다.
export async function getMyPageData() {
  const [resumeResult, repositoriesResult] = await Promise.allSettled([
    getMyResume(),
    getMyGithubRepositories(),
  ])

  if (resumeResult.status === 'rejected') {
    throw resumeResult.reason
  }

  return {
    resume: resumeResult.value,
    repositories:
      repositoriesResult.status === 'fulfilled' ? repositoriesResult.value : [],
    repositoryError:
      repositoriesResult.status === 'rejected'
        ? toErrorMessage(repositoriesResult.reason)
        : null,
  }
}

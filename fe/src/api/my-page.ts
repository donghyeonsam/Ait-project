import { getMyGithubRepositories } from '@/api/github'
import { ApiError, toErrorMessage } from '@/api/http'
import { getMyResume } from '@/api/resume'

export async function getMyPageData() {
  const [resumeResult, repositoriesResult] = await Promise.allSettled([
    getMyResume(),
    getMyGithubRepositories(),
  ])

  // 이력서를 아직 작성하지 않은 사용자는 정상 상태이므로(404), 마이페이지 자체를
  // 막지 않고 resume을 null로 둔다. 그 외 오류(네트워크, 서버 오류 등)만 페이지 오류로 취급한다.
  if (resumeResult.status === 'rejected') {
    const isMissingResume = resumeResult.reason instanceof ApiError && resumeResult.reason.status === 404
    if (!isMissingResume) throw resumeResult.reason
  }

  return {
    resume: resumeResult.status === 'fulfilled' ? resumeResult.value : null,
    repositories:
      repositoriesResult.status === 'fulfilled' ? repositoriesResult.value : [],
    repositoryError:
      repositoriesResult.status === 'rejected'
        ? toErrorMessage(repositoriesResult.reason)
        : null,
  }
}

import { getMyGithubRepositories } from '@/api/github'
import { toErrorMessage } from '@/api/http'
import { getMyResume } from '@/api/resume'

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

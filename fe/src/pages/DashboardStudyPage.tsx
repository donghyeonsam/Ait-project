import { Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  getReceivedPeerFeedbacks,
  type PeerFeedback,
} from '@/api/peer-feedback'
import { toErrorMessage } from '@/api/http'
import { PageLayout } from '@/components/layout/PageLayout'
import { StudyEvaluationRadar } from '@/components/study/StudyEvaluationRadar'
import { Button } from '@/components/ui/button'
import { studyEvaluationCategories } from '@/mocks/study'
import { averageEvaluationScores } from '@/lib/peer-evaluation'

// 대시보드의 스터디 화면. 세션에서 받은 상호평가를 항목별 평균과 남겨진 코멘트로 보여준다.
// 평가자는 밝히지 않고 익명 집계로만 다룬다.
export function DashboardStudyPage() {
  const [feedbacks, setFeedbacks] = useState<PeerFeedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 최초 로딩은 isLoading 초기값(true)이 담당하고, 재시도 시에만 호출부에서 다시 세운다.
  const loadFeedbacks = useCallback(
    () =>
      getReceivedPeerFeedbacks()
        .then((response) => {
          setFeedbacks(response)
          setLoadError(null)
        })
        .catch((error: unknown) => {
          setFeedbacks([])
          setLoadError(toErrorMessage(error))
        })
        .finally(() => setIsLoading(false)),
    [],
  )

  useEffect(() => {
    void loadFeedbacks()
  }, [loadFeedbacks])

  const averageScores = averageEvaluationScores(feedbacks)
  const overallAverage =
    feedbacks.length === 0
      ? 0
      : Math.round(
          (feedbacks.reduce((sum, feedback) => sum + feedback.scoreAvg, 0) /
            feedbacks.length) *
            10,
        ) / 10
  const comments = feedbacks.filter((feedback) => feedback.feedback?.trim())

  return (
    <PageLayout contentClassName="max-w-dashboard">
      <section className="pb-8 pt-12" aria-labelledby="page-title">
        <h1 id="page-title" className="text-h1">
          스터디 라운지
        </h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          스터디 세션에서 받은 평가를 모아 역량 변화를 확인해보세요.
        </p>
      </section>

      {isLoading ? (
        <section className="dashboard-panel mb-24 min-h-96" role="status">
          <p className="py-32 text-center text-body-1 text-text-secondary">
            받은 평가를 불러오고 있어요...
          </p>
        </section>
      ) : loadError ? (
        <section className="dashboard-panel mb-24 flex min-h-96 flex-col items-center justify-center text-center">
          <p className="text-body-1 text-status-error" role="alert">
            {loadError}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setIsLoading(true)
              void loadFeedbacks()
            }}
          >
            다시 시도
          </Button>
        </section>
      ) : feedbacks.length === 0 ? (
        <section
          className="dashboard-panel mb-24 flex min-h-96 flex-col items-center justify-center text-center"
          aria-labelledby="empty-title"
        >
          <span
            className="flex size-16 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary"
            aria-hidden="true"
          >
            <Users className="size-8" />
          </span>
          <h2 id="empty-title" className="mt-5 text-h2">
            아직 받은 평가가 없습니다
          </h2>
          <p className="mt-2 text-body-2 text-text-secondary">
            화상 스터디 세션에 참여하면 함께한 팀원들의 평가가 여기에 모입니다.
          </p>
        </section>
      ) : (
        <>
          <section
            className="dashboard-panel mb-6"
            aria-labelledby="evaluation-summary-title"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="evaluation-summary-title" className="text-h2">
                받은 평가 평균
              </h2>
              <p className="text-caption text-text-secondary">
                평가 {feedbacks.length}건 · 평균 {overallAverage}점
              </p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
              <StudyEvaluationRadar
                scores={averageScores}
                caption="받은 평가 평균"
              />

              <ul className="grid content-start gap-3 sm:grid-cols-2">
                {studyEvaluationCategories.map((category) => (
                  <li
                    key={category}
                    className="rounded-ait-s border border-border-default px-4 py-3"
                  >
                    <p className="text-caption text-text-secondary">{category}</p>
                    <p className="mt-1 text-body-1 font-semibold text-text-primary">
                      {averageScores[category]}
                      <span className="text-caption font-normal text-text-secondary">
                        {' '}
                        / 10
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="dashboard-panel mb-24" aria-labelledby="comments-title">
            <h2 id="comments-title" className="text-h2">
              남겨진 코멘트
            </h2>
            {comments.length === 0 ? (
              <p className="mt-4 text-body-2 text-text-secondary">
                아직 코멘트가 없습니다. 점수만 등록된 평가는 위 평균에 반영됩니다.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {comments.map((feedback) => (
                  <li
                    key={feedback.id}
                    className="rounded-ait-s border border-border-default px-4 py-3"
                  >
                    <p className="text-caption text-text-secondary">
                      평균 {feedback.scoreAvg}점
                    </p>
                    <p className="mt-1 text-body-2 text-text-primary">
                      {feedback.feedback}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </PageLayout>
  )
}

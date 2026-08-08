import { Check } from 'lucide-react'
import type { InterviewPreparation } from '@/api/ai-interviews'
import type { SurveyState } from '@/components/interview/useInterviewSurvey'
import { Button } from '@/components/ui/button'

interface Step4SummaryProps {
  state: SurveyState
  preparation: InterviewPreparation | null
  canConfirm: boolean
  isConfirmed: boolean
  onConfirm: () => void
  onReset: () => void
}

interface SummaryRow {
  label: string
  value: string
}

// 설문 4단계. 선택 내용을 최종 확인하는 요약 화면. 확인을 눌러야 5단계(환경 설정)가 열리고,
// 그 시점에 맞춰 AI 질문 생성 요청도 시작된다. 확인 후에는 1~3단계가 잠기며, 다시 고치려면
// 초기화 버튼으로 처음부터 다시 진행해야 한다.
export function Step4Summary({ state, preparation, canConfirm, isConfirmed, onConfirm, onReset }: Step4SummaryProps) {
  const coverLetterTitle = preparation?.coverLetters
    .find((coverLetter) => String(coverLetter.id) === state.coverLetterId)?.title ?? '-'
  const repositoryName = preparation?.githubRepositories
    .find((repository) => String(repository.id) === state.repositoryId)
    ?.repoNickname ?? ''

  // 면접 유형에 따라 지원 정보/CS 주제는 해당되지 않으면 요약에서 '-'로 비운다.
  const showApplyInfo = state.interviewType !== null && state.interviewType !== 'CS 면접'
  const showCsTopics = state.interviewType === 'CS 면접' || state.interviewType === '종합'

  const rows: SummaryRow[] = [
    { label: '면접 유형', value: state.interviewType ?? '-' },
    { label: '지원 직무', value: showApplyInfo ? state.position || '-' : '-' },
    { label: '자소서', value: showApplyInfo ? coverLetterTitle : '-' },
    {
      label: '난이도 · 스타일',
      value: state.difficulty && state.style ? `${state.difficulty} · ${state.style}` : '-',
    },
    { label: '레포지토리', value: showApplyInfo && repositoryName ? repositoryName : '-' },
    { label: 'CS 주제', value: showCsTopics && state.csTopics.length > 0 ? state.csTopics.join(', ') : '-' },
  ]

  return (
    // 카드 테두리는 페이지의 스텝 섹션 래퍼가 제공하므로 여기서는 내용만 배치한다.
    <section aria-labelledby="step4-title">
      <h2 id="step4-title" className="text-h3 text-center">최종확인</h2>
      <p className="mt-1 text-center text-body-2 text-text-secondary">선택한 항목들을 확인하세요</p>

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-body-2 text-text-secondary">{row.label}</dt>
            <dd className="mt-1 text-body-1 font-medium text-text-primary">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-col items-center gap-2 border-t border-border-default pt-6">
        <div className="flex items-center gap-3">
          <Button type="button" disabled={!canConfirm} onClick={onConfirm}>
            {isConfirmed ? (
              <>
                <Check className="size-4" aria-hidden="true" />
                확인 완료 · 환경 설정으로 이동
              </>
            ) : (
              '이 내용으로 확인했어요'
            )}
          </Button>
          {isConfirmed ? (
            <Button type="button" variant="secondary" onClick={onReset}>
              다시 선택하기
            </Button>
          ) : null}
        </div>
        {isConfirmed ? null : (
          <p className="text-caption text-text-secondary">확인하면 위 선택을 바탕으로 AI가 질문 생성을 시작해요.</p>
        )}
      </div>
    </section>
  )
}

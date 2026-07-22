import type { SurveyState } from '@/components/interview/useInterviewSurvey'
import { repositoryOptions, resumeOptions } from '@/mocks/interview'

interface Step4SummaryProps {
  state: SurveyState
}

interface SummaryRow {
  label: string
  value: string
}

export function Step4Summary({ state }: Step4SummaryProps) {
  const resumeTitle = resumeOptions.find((resume) => resume.id === state.resumeId)?.title ?? '-'
  const repositoryNames = repositoryOptions
    .filter((repository) => state.repositoryIds.includes(repository.id))
    .map((repository) => repository.name)
    .join(', ')

  const showApplyInfo = state.interviewType !== null && state.interviewType !== 'CS 면접'
  const showCsTopics = state.interviewType === 'CS 면접' || state.interviewType === '종합'

  const rows: SummaryRow[] = [
    { label: '면접 유형', value: state.interviewType ?? '-' },
    { label: '지원 직무', value: showApplyInfo ? state.position || '-' : '-' },
    { label: '자소서', value: showApplyInfo ? resumeTitle : '-' },
    {
      label: '난이도 · 스타일',
      value: state.difficulty && state.style ? `${state.difficulty} · ${state.style}` : '-',
    },
    { label: '레포지토리', value: showApplyInfo && repositoryNames ? repositoryNames : '-' },
    { label: 'CS 주제', value: showCsTopics && state.csTopics.length > 0 ? state.csTopics.join(', ') : '-' },
  ]

  return (
    <section aria-labelledby="step4-title" className="rounded-ait-m border border-border-default p-8">
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
    </section>
  )
}

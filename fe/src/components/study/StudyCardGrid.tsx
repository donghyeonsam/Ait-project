import { SearchX } from 'lucide-react'
import { StudyCard } from '@/components/study/StudyCard'
import type { StudyCardData } from '@/components/study/StudyCard'

interface StudyCardGridProps {
  studies: StudyCardData[]
  appliedStudyIds: Set<number>
  onApply: (study: StudyCardData) => void
}

// 현재 검색·필터 결과를 반응형 카드 그리드 또는 빈 상태로 보여준다.
export function StudyCardGrid({
  studies,
  appliedStudyIds,
  onApply,
}: StudyCardGridProps) {
  if (studies.length === 0) {
    return (
      <div className="mt-8 flex min-h-60 flex-col items-center justify-center rounded-ait-m border border-border-default bg-background-default p-8 text-center">
        <SearchX className="size-8 text-text-secondary" aria-hidden="true" />
        <p className="mt-4 text-h3 text-text-primary">조건에 맞는 스터디가 없어요.</p>
        <p className="mt-2 text-body-2 text-text-secondary">
          검색어를 줄이거나 다른 모집 상태를 선택해보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {studies.map((study, index) => (
        <StudyCard
          key={study.id}
          study={study}
          isApplied={appliedStudyIds.has(study.id)}
          onApply={onApply}
          index={index}
        />
      ))}
    </div>
  )
}

import { ChevronDown, Search } from 'lucide-react'

export type RecruitmentFilter = 'all' | 'recruiting' | 'active' | 'closed'
export type StudySort = 'latest' | 'oldest'

interface StudySearchFiltersProps {
  query: string
  recruitment: RecruitmentFilter
  sort: StudySort
  onQueryChange: (value: string) => void
  onRecruitmentChange: (value: RecruitmentFilter) => void
  onSortChange: (value: StudySort) => void
}

function SelectChevron() {
  return (
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
      aria-hidden="true"
    />
  )
}

// 검색어·모집 상태·정렬 조건을 한 영역에서 제어한다.
// 직무 필터는 스터디 그룹 응답에 직무 정보가 없어 제공하지 않는다.
export function StudySearchFilters({
  query,
  recruitment,
  sort,
  onQueryChange,
  onRecruitmentChange,
  onSortChange,
}: StudySearchFiltersProps) {
  return (
    <div className="mt-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_10rem]">
        <label className="relative block">
          <span className="sr-only">스터디 검색</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-chart-axis"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="스터디 명이나 소개를 검색해보세요."
            className="h-11 w-full rounded-ait-s border border-border-default bg-surface-default pl-12 pr-4 text-body-2 text-text-primary shadow-elevation-1 transition-[border-color,box-shadow] placeholder:text-chart-axis focus:border-action-primary"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">모집 상태 선택</span>
          <select
            value={recruitment}
            onChange={(event) =>
              onRecruitmentChange(event.target.value as RecruitmentFilter)
            }
            className="h-11 w-full appearance-none rounded-ait-s border border-border-default bg-surface-default px-4 pr-10 text-body-2 text-text-secondary shadow-elevation-1 transition-[border-color,box-shadow] focus:border-action-primary"
          >
            <option value="all">모집 상태</option>
            <option value="recruiting">모집 중</option>
            <option value="active">활동 중</option>
            <option value="closed">종료</option>
          </select>
          <SelectChevron />
        </label>

        <label className="relative block">
          <span className="sr-only">정렬 방식 선택</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as StudySort)}
            className="h-11 w-full appearance-none rounded-ait-s border border-border-default bg-surface-default px-4 pr-10 text-body-2 text-text-secondary shadow-elevation-1 transition-[border-color,box-shadow] focus:border-action-primary"
          >
            <option value="latest">최신 순</option>
            <option value="oldest">오래된 순</option>
          </select>
          <SelectChevron />
        </label>
      </div>
    </div>
  )
}

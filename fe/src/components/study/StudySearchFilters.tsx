import { ChevronDown, Search } from 'lucide-react'
import type { StudyRole } from '@/mocks/study-lounge'

export type RecruitmentFilter = 'all' | 'recruiting' | 'pending' | 'closed'
export type StudySort = 'latest' | 'closing' | 'available'
export type RoleFilter = '전체' | StudyRole

interface StudySearchFiltersProps {
  query: string
  role: RoleFilter
  recruitment: RecruitmentFilter
  sort: StudySort
  onQueryChange: (value: string) => void
  onRoleChange: (value: RoleFilter) => void
  onRecruitmentChange: (value: RecruitmentFilter) => void
  onSortChange: (value: StudySort) => void
}

const roleOptions: RoleFilter[] = [
  '전체',
  '프론트엔드',
  '백엔드',
  'AI',
  '서버',
  'DATA',
  'INFRA',
  'PM/PO',
  'PT면접',
  '인성면접',
]

const chipOptions: RoleFilter[] = [
  '프론트엔드',
  '백엔드',
  'AI',
  'PT면접',
  '인성면접',
]

function SelectChevron() {
  return (
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
      aria-hidden="true"
    />
  )
}

// 검색어·직무·모집 상태·정렬 조건을 한 영역에서 제어한다.
export function StudySearchFilters({
  query,
  role,
  recruitment,
  sort,
  onQueryChange,
  onRoleChange,
  onRecruitmentChange,
  onSortChange,
}: StudySearchFiltersProps) {
  return (
    <div className="mt-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem]">
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
            placeholder="직무, 기업 또는 스터디 명을 검색해보세요."
            className="h-11 w-full rounded-ait-s border border-border-default bg-surface-default pl-12 pr-4 text-body-2 text-text-primary shadow-elevation-1 transition-[border-color,box-shadow] placeholder:text-chart-axis focus:border-action-primary"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">직무 선택</span>
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value as RoleFilter)}
            className="h-11 w-full appearance-none rounded-ait-s border border-border-default bg-surface-default px-4 pr-10 text-body-2 text-text-secondary shadow-elevation-1 transition-[border-color,box-shadow] focus:border-action-primary"
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option === '전체' ? '직무 전체' : option}
              </option>
            ))}
          </select>
          <SelectChevron />
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
            <option value="recruiting">진행 중</option>
            <option value="pending">신청 대기</option>
            <option value="closed">마감</option>
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
            <option value="closing">마감 임박 순</option>
            <option value="available">참여 가능 순</option>
          </select>
          <SelectChevron />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-3" aria-label="직무 빠른 필터">
        {chipOptions.map((option) => {
          const isSelected = role === option
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onRoleChange(isSelected ? '전체' : option)}
              className={`rounded-ait-pill border px-4 py-1 text-caption transition-[color,background-color,border-color] ${
                isSelected
                  ? 'border-action-primary bg-action-primary text-surface-default'
                  : 'border-border-default bg-surface-default text-text-secondary hover:border-action-primary hover:text-action-primary'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

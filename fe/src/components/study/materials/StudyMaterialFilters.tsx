import { ChevronDown, Search } from 'lucide-react'

interface StudyMaterialFiltersProps {
  query: string
  // 올린 사람 닉네임. 빈 문자열이면 전체를 뜻한다.
  uploader: string
  uploaderOptions: string[]
  onQueryChange: (value: string) => void
  onUploaderChange: (value: string) => void
}

// 파일명 검색어와 올린 사람 조건으로 자료 목록을 거르는 필터 영역. 지금까지 불러온 자료에만 적용된다.
export function StudyMaterialFilters({
  query,
  uploader,
  uploaderOptions,
  onQueryChange,
  onUploaderChange,
}: StudyMaterialFiltersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
      <label className="relative block">
        <span className="sr-only">파일명 검색</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-chart-axis"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="파일명을 검색해보세요."
          className="h-11 w-full rounded-ait-s border border-border-default bg-surface-default pl-12 pr-4 text-body-2 text-text-primary shadow-elevation-1 transition-[border-color,box-shadow] placeholder:text-chart-axis focus:border-action-primary"
        />
      </label>

      <label className="relative block">
        <span className="sr-only">올린 사람 선택</span>
        <select
          value={uploader}
          onChange={(event) => onUploaderChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-ait-s border border-border-default bg-surface-default px-4 pr-10 text-body-2 text-text-secondary shadow-elevation-1 transition-[border-color,box-shadow] focus:border-action-primary"
        >
          <option value="">올린 사람 전체</option>
          {uploaderOptions.map((nickname) => (
            <option key={nickname} value={nickname}>
              {nickname}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
          aria-hidden="true"
        />
      </label>
    </div>
  )
}

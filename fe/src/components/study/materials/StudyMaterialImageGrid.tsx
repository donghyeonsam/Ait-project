import type { StudyMaterialImage } from '@/types/study-materials'

interface MonthGroup {
  label: string
  items: { image: StudyMaterialImage; index: number }[]
}

// 최신순 정렬을 전제로 월 헤더를 붙이기 위해 원본 배열 인덱스를 유지한 채 월별로 묶는다.
function groupByMonth(images: StudyMaterialImage[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  images.forEach((image, index) => {
    const date = new Date(image.createdAt)
    const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`
    const lastGroup = groups[groups.length - 1]
    if (lastGroup?.label === label) {
      lastGroup.items.push({ image, index })
    } else {
      groups.push({ label, items: [{ image, index }] })
    }
  })
  return groups
}

interface StudyMaterialImageGridProps {
  images: StudyMaterialImage[]
  onSelect: (index: number) => void
}

// 공유된 이미지를 월별 섹션의 정사각 썸네일 그리드로 모아 보여주는 자료실 이미지 탭.
export function StudyMaterialImageGrid({
  images,
  onSelect,
}: StudyMaterialImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="rounded-ait-m border border-border-default bg-surface-default py-16 text-center">
        <p className="text-body-1 text-text-primary">아직 공유된 이미지가 없어요</p>
        <p className="mt-2 text-body-2 text-text-secondary">
          그룹톡에서 이미지를 공유하면 이곳에 모아볼 수 있어요.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {groupByMonth(images).map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="text-body-2 font-semibold text-text-primary">
            {group.label}
          </h3>
          <ul className="mt-3 grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5">
            {group.items.map(({ image, index }) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className="group block aspect-square w-full overflow-hidden rounded-ait-s bg-status-neutral-surface focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-action-primary/25"
                  aria-label={`${image.originalFilename} 크게 보기`}
                >
                  <img
                    src={image.url}
                    alt={image.originalFilename}
                    loading="lazy"
                    className="size-full object-cover transition-transform [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] group-hover:scale-105"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

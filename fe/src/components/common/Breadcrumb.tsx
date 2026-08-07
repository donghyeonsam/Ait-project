import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  // 경로가 없으면 현재 페이지로 취급해 링크 없이 강조 표시한다.
  to?: string
}

// 상위 경로를 보여주는 브레드크럼 내비게이션. 마지막 항목이 현재 페이지다.
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="현재 위치">
      <ol className="flex flex-wrap items-center gap-1 py-2 text-caption">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? (
                <li aria-hidden="true">
                  <ChevronRight className="size-3 text-chart-axis" />
                </li>
              ) : null}
              <li>
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="rounded-ait-s text-text-secondary transition-colors hover:text-action-primary"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={
                      isLast
                        ? 'font-medium text-text-primary'
                        : 'text-text-secondary'
                    }
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

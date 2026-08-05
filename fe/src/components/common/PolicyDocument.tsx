import { AlertTriangle } from 'lucide-react'
import { PageIntro } from '@/components/common/PageIntro'

interface PolicyArticle {
  heading: string
  paragraphs?: string[]
  items?: string[]
}

interface PolicyDocumentProps {
  title: string
  draftedOn: string
  articles: PolicyArticle[]
}

// 이용약관 · 개인정보처리방침 · 녹화·AI 분석 안내에서 공통으로 쓰는 조항형 문서 레이아웃.
// 법무 검토 전 초안임을 알리는 배너와 조(條) 단위 본문을 함께 렌더링한다.
export function PolicyDocument({ title, draftedOn, articles }: PolicyDocumentProps) {
  return (
    <>
      <PageIntro title={title} description={`초안 작성일 ${draftedOn}`} />

      <div
        role="note"
        className="mb-8 flex items-start gap-3 rounded-ait-m border border-status-warning-border bg-status-warning-surface px-6 py-4"
      >
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-status-warning" aria-hidden="true" />
        <p className="text-body-2 text-status-warning">
          이 문서는 서비스 운영을 위해 작성된 표준 초안이며 법무 검토 전입니다. 실제 시행 시 내용과 시행일이
          변경될 수 있습니다.
        </p>
      </div>

      <div className="pb-16">
        {articles.map((article, index) => (
          <section key={article.heading} className="border-t border-border-default py-6 first:pt-0">
            <h2 className="text-h3 text-text-primary">
              제{index + 1}조 ({article.heading})
            </h2>
            {article.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-body-1 text-text-secondary">
                {paragraph}
              </p>
            ))}
            {article.items ? (
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {article.items.map((item) => (
                  <li key={item} className="text-body-1 text-text-secondary">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </>
  )
}

import { CodeXml } from 'lucide-react'

interface SkillTagsProps {
  skills: string[]
}

export function SkillTags({ skills }: SkillTagsProps) {
  return (
    <div className="min-h-24 border-t border-border-default pt-4">
      <h3 className="flex items-center gap-2 text-body-2 font-semibold text-action-primary">
        <CodeXml className="size-4" aria-hidden="true" />
        프로젝트 사용 기술
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {skills.length ? skills.map((skill, index) => (
          <span
            key={skill}
            className="skill-tag rounded-ait-pill border border-status-success-border bg-status-success-surface px-3 py-1 text-caption font-semibold text-status-success"
            style={{ '--tag-order': index } as React.CSSProperties}
          >
            {skill}
          </span>
        )) : (
          <span className="text-caption text-text-secondary">등록된 기술이 없습니다.</span>
        )}
      </div>
    </div>
  )
}

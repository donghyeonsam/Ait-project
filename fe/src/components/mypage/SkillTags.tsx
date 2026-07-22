import { CodeXml } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SkillTagsProps {
  skills: string[]
  isEditing: boolean
  inputValue: string
  onInputChange: (value: string) => void
}

export function SkillTags({
  skills,
  isEditing,
  inputValue,
  onInputChange,
}: SkillTagsProps) {
  return (
    <div className="min-h-24 border-t border-border-default pt-4">
      <h3 className="flex items-center gap-2 text-body-2 font-semibold text-action-primary">
        <CodeXml className="size-4" aria-hidden="true" />
        보유 스킬
      </h3>
      <div
        key={isEditing ? 'skills-edit' : 'skills-view'}
        className="profile-crossfade mt-3"
      >
        {isEditing ? (
          <label className="block text-caption text-text-secondary">
            <span className="sr-only">보유 스킬</span>
            <Input
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              aria-describedby="skills-helper"
            />
            <span id="skills-helper" className="mt-2 block">
              스킬은 쉼표(,)로 구분해 입력해주세요
            </span>
          </label>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <span
                key={skill}
                className="skill-tag rounded-ait-pill border border-status-success-border bg-status-success-surface px-3 py-1 text-caption font-semibold text-status-success"
                style={{ '--tag-order': index } as React.CSSProperties}
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


import { Check } from 'lucide-react'
import type { InterviewPreparation } from '@/api/ai-interviews'
import { cn } from '@/lib/utils'

interface Step2ApplyInfoProps {
  position: string
  careerLevel: string
  coverLetterId: string | null
  repositoryIds: string[]
  preparation: InterviewPreparation | null
  isLoading: boolean
  error: string | null
  onChangePosition: (value: string) => void
  onChangeCareerLevel: (value: string) => void
  onSelectCoverLetter: (id: string) => void
  onToggleRepository: (id: string) => void
}

const inputClass =
  'w-full rounded-ait-s border border-border-default bg-surface-default px-4 py-2.5 text-body-1 text-text-primary transition-colors ease-standard duration-(--duration-fast) placeholder:text-text-secondary focus:border-action-primary focus:outline-none focus:ring-3 focus:ring-action-primary/25'

export function Step2ApplyInfo({
  position,
  careerLevel,
  coverLetterId,
  repositoryIds,
  preparation,
  isLoading,
  error,
  onChangePosition,
  onChangeCareerLevel,
  onSelectCoverLetter,
  onToggleRepository,
}: Step2ApplyInfoProps) {
  return (
    <section aria-labelledby="step2-apply-title">
      <h2 id="step2-apply-title" className="text-h3">어디에 지원하고 있나요?</h2>
      <p className="mt-1 text-body-2 text-text-secondary">정해지지 않은 항목은 비워두어도 괜찮아요.</p>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <label htmlFor="apply-position" className="text-body-2 font-medium text-text-primary">지원 직무</label>
          <input
            id="apply-position"
            type="text"
            value={position}
            onChange={(event) => onChangePosition(event.target.value)}
            placeholder="예: 프론트엔드 개발자"
            className={cn(inputClass, 'mt-2')}
          />
        </div>
        <div>
          <label htmlFor="apply-career" className="text-body-2 font-medium text-text-primary">경력 구분</label>
          <input
            id="apply-career"
            type="text"
            value={careerLevel}
            onChange={(event) => onChangeCareerLevel(event.target.value)}
            placeholder="예: 신입, 3년 차"
            className={cn(inputClass, 'mt-2')}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <span className="text-body-2 font-medium text-text-primary">자소서 선택</span>
          <ul className="mt-2 h-56 space-y-2 overflow-y-auto rounded-ait-s border border-border-default p-2" role="radiogroup" aria-label="자소서 선택">
            {isLoading ? (
              <li className="px-3 py-8 text-center text-body-2 text-text-secondary" role="status">
                자소서를 불러오는 중입니다.
              </li>
            ) : error ? (
              <li className="px-3 py-8 text-center text-body-2 text-status-error" role="alert">
                {error}
              </li>
            ) : preparation?.coverLetters.length ? preparation.coverLetters.map((coverLetter) => {
              const id = String(coverLetter.id)
              const isSelected = coverLetterId === id
              return (
                <li key={coverLetter.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSelectCoverLetter(id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-ait-s px-3 py-2.5 text-left transition-colors ease-standard duration-(--duration-fast)',
                      isSelected ? 'bg-status-success-surface' : 'hover:bg-status-neutral-surface',
                    )}
                  >
                    <span>
                      <span className="block text-body-2 text-text-primary">{coverLetter.title}</span>
                      <span className="block text-caption text-text-secondary">
                        {coverLetter.companyName} · 최근 수정일 {new Date(coverLetter.updatedAt).toLocaleDateString('ko-KR')}
                      </span>
                    </span>
                    {isSelected ? <Check className="size-5 shrink-0 text-status-success" aria-hidden="true" /> : null}
                  </button>
                </li>
              )
            }) : (
              <li className="px-3 py-8 text-center text-body-2 text-text-secondary">
                등록된 자소서가 없습니다.
              </li>
            )}
          </ul>
        </div>

        <div>
          <span className="text-body-2 font-medium text-text-primary">
            레포지토리 선택
            <span className="ml-2 text-caption font-normal text-text-secondary">다중선택 가능</span>
          </span>
          <ul className="mt-2 h-56 space-y-2 overflow-y-auto rounded-ait-s border border-border-default p-2" aria-label="레포지토리 선택">
            {isLoading ? (
              <li className="px-3 py-8 text-center text-body-2 text-text-secondary" role="status">
                레포지토리를 불러오는 중입니다.
              </li>
            ) : error ? (
              <li className="px-3 py-8 text-center text-body-2 text-status-error" role="alert">
                {error}
              </li>
            ) : preparation?.githubRepositories.length ? preparation.githubRepositories.map((repository) => {
              const id = String(repository.id)
              const isSelected = repositoryIds.includes(id)
              return (
                <li key={repository.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onToggleRepository(id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-ait-s px-3 py-2.5 text-left transition-colors ease-standard duration-(--duration-fast)',
                      isSelected ? 'bg-status-success-surface' : 'hover:bg-status-neutral-surface',
                    )}
                  >
                    <span>
                      <span className="block text-body-2 text-text-primary">{repository.repoNickname}</span>
                      <span className="block text-caption text-text-secondary">{repository.repoName}</span>
                    </span>
                    {isSelected ? <Check className="size-5 shrink-0 text-status-success" aria-hidden="true" /> : null}
                  </button>
                </li>
              )
            }) : (
              <li className="px-3 py-8 text-center text-body-2 text-text-secondary">
                등록된 레포지토리가 없습니다.
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}

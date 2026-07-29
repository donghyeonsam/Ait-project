import type { CommunityCategory } from '@/types/community'

// 커뮤니티 카테고리 라벨·배지 색상 매핑. 배지 컴포넌트와 폼 옵션이 함께 쓴다.
export const CATEGORY_META: Record<
  CommunityCategory,
  { label: string; badgeClass: string }
> = {
  review: { label: '면접 후기', badgeClass: 'bg-badge-review-surface text-badge-review' },
  qna: { label: '질문 · 답변', badgeClass: 'bg-badge-qna-surface text-badge-qna' },
  tip: { label: '면접 팁', badgeClass: 'bg-badge-tip-surface text-badge-tip' },
  study: { label: '스터디 모집', badgeClass: 'bg-badge-study-surface text-badge-study' },
}

export const CATEGORY_OPTIONS = (
  Object.keys(CATEGORY_META) as CommunityCategory[]
).map((value) => ({ value, label: CATEGORY_META[value].label }))

import type { Transition, Variants } from 'framer-motion'

// 커뮤니티 화면 공통 모션 프리셋. 지속시간·이징 기준은 프롬프트 7절을 따른다.

// 기본 이징 cubic-bezier(0.22, 1, 0.36, 1)
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

// 라우트 전환: opacity 0→1, y 8px→0
export const pageEnter: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
}

// 카드 목록 stagger 진입
export const listContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
}

export const listItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease: EASE_OUT },
  },
}

// 드롭다운·팝오버 열림/닫힘
export const dropdownPanel: Variants = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.16, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.98,
    transition: { duration: 0.12, ease: EASE_OUT },
  },
}

// 인기 태그 롤링(아래 → 위)
export const tickerItem: Variants = {
  initial: { y: '100%', opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
  exit: {
    y: '-100%',
    opacity: 0,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
}

// 답글 스레드 등 height: 0 ↔ auto 펼침
export const collapseSection: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: EASE_OUT },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.26, ease: EASE_OUT },
  },
}

// 필터·탭 전환 시 좌우로 슬라이드. custom에 1(다음)/-1(이전) 방향을 넘긴다.
export const filterSlide: Variants = {
  initial: (direction: number) => ({ x: direction > 0 ? 16 : -16, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: (direction: number) => ({
    x: direction > 0 ? -16 : 16,
    opacity: 0,
    transition: { duration: 0.15, ease: EASE_OUT },
  }),
}

// 토글·세그먼트 인디케이터용 스프링
export const segmentSpring: Transition = { type: 'spring', stiffness: 300, damping: 28 }
export const toggleSpring: Transition = { type: 'spring', stiffness: 500, damping: 32 }
export const tabSpring: Transition = { type: 'spring', stiffness: 320, damping: 30 }

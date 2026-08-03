const LISTENING_PRIMARY_VIDEO_SOURCES = [
  '/interviewer_video/평시_숨쉬기.mp4',
  '/interviewer_video/평시_깜빡임3회.mp4',
] as const

const LISTENING_REACTION_VIDEO_SOURCES = [
  '/interviewer_video/평시_눈 2번 깜빡임.mp4',
  '/interviewer_video/깜빡임+끄덕임.mp4',
  '/interviewer_video/끄덕임.mp4',
  '/interviewer_video/인사.mp4',
  '/interviewer_video/큰숨.mp4',
] as const

const PRIMARY_VIDEO_WEIGHT = 0.8

type ListeningVideoCategory = 'primary' | 'reaction'

interface ListeningVideoSelection {
  src: string
  category: ListeningVideoCategory
}

function randomItem<T>(items: readonly T[], random: () => number) {
  const index = Math.min(items.length - 1, Math.floor(random() * items.length))
  return items[index]
}

// 평시 동작은 합산 80%, 그 외 반응은 합산 20%로 선택한다.
export function selectListeningVideo(
  random: () => number = Math.random,
  allowReaction = true,
): ListeningVideoSelection {
  const usePrimary = !allowReaction || random() < PRIMARY_VIDEO_WEIGHT

  if (usePrimary) {
    return {
      src: randomItem(LISTENING_PRIMARY_VIDEO_SOURCES, random),
      category: 'primary',
    }
  }

  return {
    src: randomItem(LISTENING_REACTION_VIDEO_SOURCES, random),
    category: 'reaction',
  }
}

type ListeningVideoCategory = 'primary' | 'reaction'

interface ListeningVideoSelection {
  src: string
  category: ListeningVideoCategory
}

interface WeightedListeningVideo extends ListeningVideoSelection {
  weight: number
}

const REMAINING_REACTION_WEIGHT = 10 / 3

const LISTENING_VIDEOS: readonly WeightedListeningVideo[] = [
  {
    src: '/interviewer_video/평시_깜빡임3회.mp4',
    category: 'primary',
    weight: 50,
  },
  {
    src: '/interviewer_video/평시_눈 2번 깜빡임.mp4',
    category: 'reaction',
    weight: 20,
  },
  {
    src: '/interviewer_video/평시_숨쉬기.mp4',
    category: 'primary',
    weight: 20,
  },
  {
    src: '/interviewer_video/깜빡임+끄덕임.mp4',
    category: 'reaction',
    weight: REMAINING_REACTION_WEIGHT,
  },
  {
    src: '/interviewer_video/끄덕임.mp4',
    category: 'reaction',
    weight: REMAINING_REACTION_WEIGHT,
  },
  {
    src: '/interviewer_video/큰숨.mp4',
    category: 'reaction',
    weight: REMAINING_REACTION_WEIGHT,
  },
] as const

// 경청 중 지정 비율로 영상을 선택한다. 인사 영상은 재생 목록에서 제외한다.
export function selectListeningVideo(
  random: () => number = Math.random,
): ListeningVideoSelection {
  const point = Math.min(1, Math.max(0, random())) * 100
  let accumulatedWeight = 0

  for (const video of LISTENING_VIDEOS) {
    accumulatedWeight += video.weight
    if (point < accumulatedWeight) {
      return { src: video.src, category: video.category }
    }
  }

  const fallback = LISTENING_VIDEOS[LISTENING_VIDEOS.length - 1]
  return { src: fallback.src, category: fallback.category }
}

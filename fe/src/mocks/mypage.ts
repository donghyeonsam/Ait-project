export interface Repository {
  id: number
  name: string
  url: string
}

export interface ProfileData {
  name: string
  nickname: string
  email: string
  github: string
  roles: string[]
  repositories: Repository[]
  skills: string[]
}

export interface ActivityPost {
  id: number
  title: string
  category: string
  date: string
  likes: number
  comments: number
}

export type ActivityTabId = 'written' | 'scrapped' | 'liked'

export const initialProfile: ProfileData = {
  name: '김싸피',
  nickname: '면접의 신',
  email: 'ssafy12@mail.com',
  github: 'ssafygit12@github.com',
  roles: ['백엔드 개발', 'AI 엔지니어'],
  repositories: [
    {
      id: 1,
      name: 'Ait — AI 모의면접 플랫폼',
      url: 'github.com/ssafygit12/ait',
    },
    {
      id: 2,
      name: 'AlgoMate — 알고리즘 스터디',
      url: 'github.com/ssafygit12/algomate',
    },
  ],
  skills: ['Python', 'Java', 'MySQL', 'TypeScript'],
}

export const activityTabs: Array<{ id: ActivityTabId; label: string }> = [
  { id: 'written', label: '작성한 게시글' },
  { id: 'scrapped', label: '스크랩한 게시글' },
  { id: 'liked', label: '좋아요한 게시글' },
]

export const activityPosts: Record<ActivityTabId, ActivityPost[]> = {
  written: [
    {
      id: 101,
      title: '삼성전자 DX 망한 후기',
      category: '면접 후기',
      date: '2026. 07. 10',
      likes: 11,
      comments: 4,
    },
    {
      id: 102,
      title: '면접 기본 Tip 알고 가십서',
      category: '면접 TIP',
      date: '2026. 06. 03',
      likes: 33,
      comments: 17,
    },
    {
      id: 103,
      title: '프로젝트 경험을 잘 설명하는 STAR 기법',
      category: '면접 TIP',
      date: '2026. 05. 28',
      likes: 24,
      comments: 9,
    },
  ],
  scrapped: [
    {
      id: 201,
      title: '실무진 면접에서 자주 받은 질문 20개',
      category: '면접 TIP',
      date: '2026. 07. 08',
      likes: 52,
      comments: 13,
    },
    {
      id: 202,
      title: '서류 합격부터 최종 면접까지의 기록',
      category: '면접 후기',
      date: '2026. 06. 21',
      likes: 41,
      comments: 22,
    },
  ],
  liked: [
    {
      id: 301,
      title: '백엔드 개발자 면접 체크리스트',
      category: '면접 TIP',
      date: '2026. 07. 11',
      likes: 68,
      comments: 31,
    },
    {
      id: 302,
      title: '첫 기술 면접, 떨지 않고 대답한 방법',
      category: '면접 후기',
      date: '2026. 07. 02',
      likes: 37,
      comments: 12,
    },
  ],
}


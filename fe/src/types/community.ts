// 커뮤니티 도메인 타입. 목업 단계이지만 실제 API 교체를 대비해 화면과 분리해 둔다.

export type CommunityCategory = 'review' | 'qna' | 'tip' | 'study'

export type CommunityTab = 'recommend' | 'popular' | 'latest'

export interface CommunityPost {
  id: string
  category: CommunityCategory
  title: string
  excerpt: string
  contentHtml: string
  author: string
  createdAt: string
  tags: string[]
  viewCount: number
  commentCount: number
  likeCount: number
  liked: boolean
  bookmarked: boolean
  visibility?: 'public' | 'members'
  allowComments?: boolean
  notify?: boolean
}

export interface CommunityReply {
  id: string
  author: string
  createdAt: string
  content: string
  likeCount: number
}

export interface CommunityComment extends CommunityReply {
  replies: CommunityReply[]
}

export interface TrendingKeyword {
  rank: number
  keyword: string
  // 양수 = 상승 폭, 음수 = 하락 폭, 0 = 변동 없음, 'new' = 신규 진입
  change: number | 'new'
}

export interface CommunityPostDraft {
  category: CommunityCategory | null
  title: string
  contentHtml: string
  tags: string[]
  visibility: 'public' | 'members'
  allowComments: boolean
  notify: boolean
}

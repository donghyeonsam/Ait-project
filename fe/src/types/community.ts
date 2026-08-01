// 커뮤니티 도메인 타입. 목업 단계이지만 실제 API 교체를 대비해 화면과 분리해 둔다.

export type CommunityCategory = 'review' | 'qna' | 'tip' | 'study'

export type CommunityTab = 'recommend' | 'popular' | 'latest'

export type CommunityPostFileType = 'IMAGE' | 'PDF' | 'OTHER'

export type CommunityPostFileUsageType = 'INLINE' | 'ATTACHMENT'

export interface CommunityPostFile {
  id?: number
  originalFilename: string
  storedFilename: string
  fileType: CommunityPostFileType
  usageType: CommunityPostFileUsageType
  url: string
}

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
  files?: CommunityPostFile[]
  // 본문 이미지 중 카드 썸네일로 쓸 대표 사진 URL.
  thumbnail?: string | null
  allowComments?: boolean
  notify?: boolean
}

export interface CommunityReply {
  id: string
  // 삭제된 댓글은 작성자 식별 정보 없이 내려온다.
  authorId: number | null
  author: string
  createdAt: string
  content: string
  likeCount: number
  deleted: boolean
}

export interface CommunityComment extends CommunityReply {
  replies: CommunityReply[]
}

export interface TrendingKeyword {
  rank: number
  keyword: string
  // 백엔드 인기 태그 API는 등락 정보를 제공하지 않는다.
  // 양수 = 상승 폭, 음수 = 하락 폭, 0 = 변동 없음, 'new' = 신규 진입
  change?: number | 'new'
}

export interface CommunityPostDraft {
  category: CommunityCategory | null
  title: string
  contentHtml: string
  tags: string[]
  files: CommunityPostFile[]
  thumbnail: string | null
  allowComments: boolean
  notify: boolean
}

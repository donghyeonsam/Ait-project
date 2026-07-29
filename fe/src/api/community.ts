import {
  mockComments,
  mockPosts,
  mockSearchSuggestions,
  mockTrendingKeywords,
} from '@/mocks/community'
import type {
  CommunityCategory,
  CommunityComment,
  CommunityPost,
  CommunityPostDraft,
  CommunitySort,
  CommunityTab,
  TrendingKeyword,
} from '@/types/community'

// 커뮤니티 API 레이어. 지금은 목업 데이터를 300~600ms 지연과 함께 돌려주며,
// 실제 API가 준비되면 이 모듈의 함수 내부만 교체한다.
// TODO: 실제 API 연동 필요

const delay = () =>
  new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300))

// 세션 동안 작성한 글을 목록·상세에서 함께 보여주기 위한 인메모리 저장소.
const createdPosts: CommunityPost[] = []

export interface FetchPostsParams {
  tab: CommunityTab
  category: CommunityCategory | 'all'
  sort: CommunitySort | null
  offset: number
  limit: number
  query?: string
}

export interface FetchPostsResult {
  items: CommunityPost[]
  hasMore: boolean
}

export async function fetchPosts({
  tab,
  category,
  sort,
  offset,
  limit,
  query,
}: FetchPostsParams): Promise<FetchPostsResult> {
  await delay()

  let items = [...createdPosts, ...mockPosts]

  if (category !== 'all') {
    items = items.filter((post) => post.category === category)
  }
  if (query?.trim()) {
    const keyword = query.trim().toLowerCase()
    items = items.filter(
      (post) =>
        post.title.toLowerCase().includes(keyword) ||
        post.excerpt.toLowerCase().includes(keyword) ||
        post.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    )
  }

  // 탭이 정렬 성격을 겸하므로 탭을 먼저 적용하고, 정렬 드롭다운이 최신순이 아니면 덮어쓴다.
  const byLatest = (a: CommunityPost, b: CommunityPost) =>
    b.createdAt.localeCompare(a.createdAt)
  const byPopular = (a: CommunityPost, b: CommunityPost) =>
    b.likeCount - a.likeCount
  const byComments = (a: CommunityPost, b: CommunityPost) =>
    b.commentCount - a.commentCount

  if (tab === 'latest') items.sort(byLatest)
  else if (tab === 'popular') items.sort(byPopular)

  if (sort === 'latest') items.sort(byLatest)
  else if (sort === 'popular') items.sort(byPopular)
  else if (sort === 'comments') items.sort(byComments)

  const paged = items.slice(offset, offset + limit)
  return { items: paged, hasMore: offset + limit < items.length }
}

export async function fetchPost(postId: string): Promise<CommunityPost | null> {
  await delay()
  return (
    createdPosts.find((post) => post.id === postId) ??
    mockPosts.find((post) => post.id === postId) ??
    null
  )
}

export async function fetchComments(
  postId: string,
): Promise<CommunityComment[]> {
  await delay()
  return structuredClone(mockComments[postId] ?? [])
}

export async function fetchTrendingKeywords(): Promise<TrendingKeyword[]> {
  await delay()
  return mockTrendingKeywords
}

export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  await delay()
  const keyword = query.trim().toLowerCase()
  if (keyword.length < 2) return []
  return mockSearchSuggestions
    .filter((item) => item.toLowerCase().includes(keyword))
    .slice(0, 6)
}

export async function createPost(
  draft: CommunityPostDraft,
): Promise<CommunityPost> {
  await delay()
  const post: CommunityPost = {
    id: `local-${Date.now()}`,
    category: draft.category ?? 'tip',
    title: draft.title,
    excerpt: draft.contentHtml.replace(/<[^>]+>/g, ' ').trim().slice(0, 80),
    contentHtml: draft.contentHtml,
    author: '김싸피',
    createdAt: new Date().toISOString(),
    tags: draft.tags,
    viewCount: 0,
    commentCount: 0,
    likeCount: 0,
    liked: false,
    bookmarked: false,
  }
  createdPosts.unshift(post)
  return post
}

export async function toggleLike(_postId: string, liked: boolean): Promise<boolean> {
  await delay()
  return liked
}

export async function toggleBookmark(
  _postId: string,
  bookmarked: boolean,
): Promise<boolean> {
  await delay()
  return bookmarked
}

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
const updatedPosts = new Map<string, CommunityPost>()
const deletedPostIds = new Set<string>()

// API 함수를 인증 화면 밖에서 단독 확인할 때 사용하는 목업 사용자 이름.
// TODO: 실제 API 연동 필요
const CURRENT_USER = '김싸피'

export interface FetchPostsParams {
  tab: CommunityTab
  category: CommunityCategory | 'all'
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
  offset,
  limit,
  query,
}: FetchPostsParams): Promise<FetchPostsResult> {
  await delay()

  let items = [...createdPosts, ...mockPosts]
    .filter((post) => !deletedPostIds.has(post.id))
    .map((post) => updatedPosts.get(post.id) ?? post)

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

  // 인기와 최신 탭은 각각 반응 수와 작성 시각을 기준으로 정렬한다.
  const byLatest = (a: CommunityPost, b: CommunityPost) =>
    b.createdAt.localeCompare(a.createdAt)
  const byPopular = (a: CommunityPost, b: CommunityPost) =>
    b.likeCount - a.likeCount

  if (tab === 'latest') items.sort(byLatest)
  else if (tab === 'popular') items.sort(byPopular)

  const paged = items.slice(offset, offset + limit)
  return { items: paged, hasMore: offset + limit < items.length }
}

export async function fetchPost(postId: string): Promise<CommunityPost | null> {
  await delay()
  if (deletedPostIds.has(postId)) return null
  return (
    updatedPosts.get(postId) ??
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
  author = CURRENT_USER,
): Promise<CommunityPost> {
  await delay()
  const post: CommunityPost = {
    id: `local-${Date.now()}`,
    category: draft.category ?? 'tip',
    title: draft.title,
    excerpt: draft.contentHtml.replace(/<[^>]+>/g, ' ').trim().slice(0, 80),
    contentHtml: draft.contentHtml,
    author,
    createdAt: new Date().toISOString(),
    tags: draft.tags,
    viewCount: 0,
    commentCount: 0,
    likeCount: 0,
    liked: false,
    bookmarked: false,
    visibility: draft.visibility,
    allowComments: draft.allowComments,
    notify: draft.notify,
  }
  createdPosts.unshift(post)
  return post
}

export async function updatePost(
  postId: string,
  draft: CommunityPostDraft,
  currentUserNickname = CURRENT_USER,
): Promise<CommunityPost> {
  await delay()
  const post =
    updatedPosts.get(postId) ??
    createdPosts.find((item) => item.id === postId) ??
    mockPosts.find((item) => item.id === postId)

  if (!post || deletedPostIds.has(postId)) {
    throw new Error('게시글을 찾을 수 없습니다.')
  }
  if (post.author !== currentUserNickname) {
    throw new Error('게시글을 수정할 권한이 없습니다.')
  }

  const updatedPost: CommunityPost = {
    ...post,
    category: draft.category ?? post.category,
    title: draft.title,
    excerpt: draft.contentHtml.replace(/<[^>]+>/g, ' ').trim().slice(0, 80),
    contentHtml: draft.contentHtml,
    tags: draft.tags,
    visibility: draft.visibility,
    allowComments: draft.allowComments,
    notify: draft.notify,
  }

  const createdIndex = createdPosts.findIndex((item) => item.id === postId)
  if (createdIndex >= 0) createdPosts[createdIndex] = updatedPost
  else updatedPosts.set(postId, updatedPost)

  return updatedPost
}

export async function deletePost(
  postId: string,
  currentUserNickname = CURRENT_USER,
): Promise<void> {
  await delay()
  const post =
    updatedPosts.get(postId) ??
    createdPosts.find((item) => item.id === postId) ??
    mockPosts.find((item) => item.id === postId)

  if (!post || deletedPostIds.has(postId)) {
    throw new Error('게시글을 찾을 수 없습니다.')
  }
  if (post.author !== currentUserNickname) {
    throw new Error('게시글을 삭제할 권한이 없습니다.')
  }

  const createdIndex = createdPosts.findIndex((item) => item.id === postId)
  if (createdIndex >= 0) createdPosts.splice(createdIndex, 1)
  updatedPosts.delete(postId)
  deletedPostIds.add(postId)
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

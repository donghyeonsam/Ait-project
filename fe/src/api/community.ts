import { backendRequest } from '@/api/http'
import { CATEGORY_META } from '@/lib/community-categories'
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

// 커뮤니티 API 레이어. 게시글 목록 조회는 실제 백엔드를 호출하고,
// 나머지는 목업 데이터를 300~600ms 지연과 함께 돌려준다.
// TODO: 실제 API 연동 필요

const delay = () =>
  new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300))

// 백엔드는 카테고리를 한글 라벨 문자열로 저장하므로 FE 값과 상호 변환한다.
const CATEGORY_LABEL_TO_VALUE = new Map(
  (Object.keys(CATEGORY_META) as CommunityCategory[]).map((value) => [
    CATEGORY_META[value].label,
    value,
  ]),
)

const toCategoryValue = (label: string): CommunityCategory =>
  CATEGORY_LABEL_TO_VALUE.get(label) ?? 'tip'

// Spring Data Page 직렬화 형태 중 화면이 쓰는 필드만 취한다.
interface SpringPage<T> {
  content: T[]
  last: boolean
}

// 백엔드 게시글 목록 항목. boolean 필드(isLiked 등)는 Jackson 직렬화 시
// is 접두사가 벗겨져 liked/bookmarked 키로 내려온다.
interface PostListItemResponse {
  id: number
  category: string
  title: string
  contentSummary: string | null
  nickname: string
  tags: string[] | null
  viewCount: number
  commentCount: number
  likeCount: number
  bookmarked: boolean
  liked: boolean
  createdAt: string
}

// 목록 응답에는 본문 HTML이 없어 상세 조회에서 채운다.
const toPostSummary = (item: PostListItemResponse): CommunityPost => ({
  id: String(item.id),
  category: toCategoryValue(item.category),
  title: item.title,
  excerpt: item.contentSummary ?? '',
  contentHtml: '',
  author: item.nickname,
  createdAt: item.createdAt,
  tags: item.tags ?? [],
  viewCount: item.viewCount,
  commentCount: item.commentCount,
  likeCount: item.likeCount,
  liked: item.liked ?? false,
  bookmarked: item.bookmarked ?? false,
})

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
}: FetchPostsParams): Promise<FetchPostsResult> {
  const searchParams = new URLSearchParams()
  if (category !== 'all') {
    searchParams.set('category', CATEGORY_META[category].label)
  }
  // 추천 탭은 백엔드 정렬 기준이 없어 최신순으로 대체한다. TODO: 추천 정렬 연동 필요
  searchParams.set('sortType', tab === 'popular' ? 'POPULAR' : 'LATEST')
  // 더보기는 항상 페이지 크기 배수만큼 쌓이므로 offset을 페이지 번호로 환산한다.
  searchParams.set('page', String(Math.floor(offset / limit)))
  searchParams.set('size', String(limit))

  const page = await backendRequest<SpringPage<PostListItemResponse>>(
    `/api/posts?${searchParams}`,
  )
  return { items: page.content.map(toPostSummary), hasMore: !page.last }
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

import { ApiError, backendRequest, getBackendAssetUrl } from '@/api/http'
import { CATEGORY_META } from '@/lib/community-categories'
import { COMMUNITY_SEARCH_SUGGESTIONS } from '@/lib/community-suggestions'
import {
  mockComments,
  mockTrendingKeywords,
} from '@/mocks/community'
import type {
  CommunityCategory,
  CommunityComment,
  CommunityPost,
  CommunityPostDraft,
  CommunityPostFile,
  CommunityPostFileType,
  CommunityPostFileUsageType,
  CommunityTab,
  TrendingKeyword,
} from '@/types/community'

// 커뮤니티 API 레이어. 게시글 CRUD·검색·좋아요·저장은 실제 백엔드를 호출하고,
// 댓글·트렌딩 키워드·자동완성은 목업을 300~600ms 지연과 함께 돌려준다.

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
  thumbnail: string | null
  createdAt: string
}

interface PostFileResponse {
  id: number
  originalFilename: string
  storedFilename: string
  fileType: CommunityPostFileType
  usageType: CommunityPostFileUsageType
}

const toPostFile = ({
  id,
  originalFilename,
  storedFilename,
  fileType,
  usageType,
}: PostFileResponse): CommunityPostFile => ({
  id,
  originalFilename,
  storedFilename,
  fileType,
  usageType,
  url: getBackendAssetUrl(`/images/${encodeURIComponent(storedFilename)}`),
})

// 서버가 요약을 길이 기준으로 잘라 태그 중간이 끊길 수 있어, 완성 태그와 잘린 꼬리 태그를 모두 제거한다.
const htmlToExcerpt = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/<[^>]*$/, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)

// 목록 응답에는 본문 HTML이 없어 상세 조회에서 채운다.
const toPostSummary = (item: PostListItemResponse): CommunityPost => ({
  id: String(item.id),
  category: toCategoryValue(item.category),
  title: item.title,
  excerpt: htmlToExcerpt(item.contentSummary ?? ''),
  contentHtml: '',
  author: item.nickname,
  createdAt: item.createdAt,
  tags: item.tags ?? [],
  viewCount: item.viewCount,
  commentCount: item.commentCount,
  likeCount: item.likeCount,
  liked: item.liked ?? false,
  bookmarked: item.bookmarked ?? false,
  thumbnail: item.thumbnail ?? null,
})

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

export type MyPostActivity = 'written' | 'scrapped' | 'liked'

const MY_POST_ACTIVITY_QUERY: Record<MyPostActivity, string> = {
  written: 'WRITTEN',
  scrapped: 'SCRAPPED',
  liked: 'LIKED',
}

const toFetchPostsResult = (
  page: SpringPage<PostListItemResponse>,
): FetchPostsResult => ({
  items: page.content.map(toPostSummary),
  hasMore: !page.last,
})

export async function fetchPosts({
  tab,
  category,
  offset,
  limit,
  query,
}: FetchPostsParams): Promise<FetchPostsResult> {
  const searchParams = new URLSearchParams()
  if (query?.trim()) {
    searchParams.set('keyword', query.trim())
  }
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
  return toFetchPostsResult(page)
}

export async function fetchMyActivityPosts(
  activity: MyPostActivity,
  limit = 10,
): Promise<FetchPostsResult> {
  const searchParams = new URLSearchParams({
    activityType: MY_POST_ACTIVITY_QUERY[activity],
    sortType: 'LATEST',
    page: '0',
    size: String(limit),
  })
  const page = await backendRequest<SpringPage<PostListItemResponse>>(
    `/api/posts?${searchParams}`,
  )
  return toFetchPostsResult(page)
}

// 백엔드 게시글 상세 응답 중 화면이 쓰는 필드만 취한다.
interface PostDetailResponse {
  id: number
  nickname: string
  category: string
  title: string
  content: string
  thumbnail: string | null
  allowComments: boolean | null
  receiveNotifications: boolean | null
  likeCount: number
  viewCount: number
  tags: string[] | null
  files: PostFileResponse[] | null
  createdAt: string
}

export async function fetchPost(postId: string): Promise<CommunityPost | null> {
  let data: PostDetailResponse
  try {
    data = await backendRequest<PostDetailResponse>(`/api/posts/${postId}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }

  return {
    id: String(data.id),
    category: toCategoryValue(data.category),
    title: data.title,
    excerpt: htmlToExcerpt(data.content),
    contentHtml: data.content,
    author: data.nickname,
    createdAt: data.createdAt,
    tags: data.tags ?? [],
    viewCount: data.viewCount,
    likeCount: data.likeCount,
    // 상세 응답에는 댓글 수와 좋아요·저장 여부가 없어 기본값을 쓴다. TODO: 백엔드 보완 후 연동 필요
    commentCount: 0,
    liked: false,
    bookmarked: false,
    files: (data.files ?? []).map(toPostFile),
    thumbnail: data.thumbnail ?? null,
    allowComments: data.allowComments ?? true,
    notify: data.receiveNotifications ?? true,
  }
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

// 서버 API가 없는 자동완성은 FE 후보군에서 대소문자 구분 없이 검색한다.
export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  const keyword = query.trim().toLowerCase()
  if (keyword.length < 2) return []
  return COMMUNITY_SEARCH_SUGGESTIONS
    .filter((item) => item.toLowerCase().includes(keyword))
    .slice(0, 6)
}

const inferPostFileType = (file: File): CommunityPostFileType => {
  if (file.type.startsWith('image/')) return 'IMAGE'
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return 'PDF'
  }
  return 'OTHER'
}

const toUploadedPostFile = (
  file: File,
  storedFilename: string,
  usageType: CommunityPostFileUsageType,
): CommunityPostFile => ({
  originalFilename: file.name,
  storedFilename,
  fileType: inferPostFileType(file),
  usageType,
  url: getBackendAssetUrl(`/images/${encodeURIComponent(storedFilename)}`),
})

export async function uploadPostFile(
  file: File,
  usageType: CommunityPostFileUsageType,
): Promise<CommunityPostFile> {
  const formData = new FormData()
  formData.append('file', file)
  const storedFilename = await backendRequest<string>('/api/files/upload', {
    method: 'POST',
    body: formData,
  })
  return toUploadedPostFile(file, storedFilename, usageType)
}

export async function uploadPostFiles(
  files: File[],
  usageType: CommunityPostFileUsageType,
): Promise<CommunityPostFile[]> {
  if (files.length === 0) return []

  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  const storedFilenames = await backendRequest<string[]>('/api/files/uploads', {
    method: 'POST',
    body: formData,
  })

  if (storedFilenames.length !== files.length) {
    throw new Error('업로드한 파일 정보를 확인할 수 없습니다.')
  }

  return files.map((file, index) =>
    toUploadedPostFile(file, storedFilenames[index], usageType),
  )
}

// 대표 사진(thumbnail)은 아직 대응하는 백엔드 필드가 없어 서버에 저장되지 않는다.
// TODO: 백엔드 thumbnail 필드 추가 후 연동 필요
const toPostRequestBody = (draft: CommunityPostDraft) => ({
  category: draft.category ? CATEGORY_META[draft.category].label : '',
  title: draft.title,
  content: draft.contentHtml,
  thumbnail: draft.thumbnail,
  allowComments: draft.allowComments,
  receiveNotifications: draft.notify,
  tags: draft.tags,
  files: draft.files.map(
    ({ originalFilename, storedFilename, fileType, usageType }) => ({
      originalFilename,
      storedFilename,
      fileType,
      usageType,
    }),
  ),
})

// 생성된 게시글의 id를 문자열로 돌려준다.
export async function createPost(draft: CommunityPostDraft): Promise<string> {
  const postId = await backendRequest<number>('/api/posts', {
    method: 'POST',
    body: JSON.stringify(toPostRequestBody(draft)),
  })
  return String(postId)
}

// 작성자 검증은 토큰 기반으로 백엔드가 수행한다.
export async function updatePost(
  postId: string,
  draft: CommunityPostDraft,
): Promise<void> {
  await backendRequest<void>(`/api/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(toPostRequestBody(draft)),
  })
}

// 작성자 검증은 토큰 기반으로 백엔드가 수행한다.
export async function deletePost(postId: string): Promise<void> {
  await backendRequest<void>(`/api/posts/${postId}`, {
    method: 'DELETE',
  })
}

// 상세 응답에 좋아요·저장 여부가 없어 화면 상태가 실제와 어긋날 수 있다.
// 이미 등록된 상태의 등록(409)과 이미 취소된 상태의 취소(404)는
// 목표 상태와 일치하므로 성공으로 간주한다.
async function setInteraction(path: string, on: boolean) {
  try {
    await backendRequest<void>(path, { method: on ? 'POST' : 'DELETE' })
  } catch (error) {
    if (error instanceof ApiError && error.status === (on ? 409 : 404)) return
    throw error
  }
}

export async function toggleLike(postId: string, liked: boolean): Promise<boolean> {
  await setInteraction(`/api/posts/${postId}/likes`, liked)
  return liked
}

export async function toggleBookmark(
  postId: string,
  bookmarked: boolean,
): Promise<boolean> {
  await setInteraction(`/api/posts/${postId}/scraps`, bookmarked)
  return bookmarked
}

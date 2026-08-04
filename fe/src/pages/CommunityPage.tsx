import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchPosts,
  fetchTrendingKeywords,
  toggleBookmark,
  toggleLike,
} from '@/api/community'
import { PageTransition } from '@/components/common/PageTransition'
import { HeroSearch } from '@/components/community/HeroSearch'
import { LoadMoreButton } from '@/components/community/LoadMoreButton'
import { PostCard, PostCardSkeleton } from '@/components/community/PostCard'
import { PostTabs } from '@/components/community/PostTabs'
import { TrendingKeywordTicker } from '@/components/community/TrendingKeywordTicker'
import { PageLayout } from '@/components/layout/PageLayout'
import { Dropdown } from '@/components/ui/dropdown'
import { CATEGORY_OPTIONS } from '@/lib/community-categories'
import { EASE_OUT, listContainer } from '@/lib/motion'
import type {
  CommunityCategory,
  CommunityPost,
  CommunitySearchTargets,
  CommunityTab,
  TrendingKeyword,
} from '@/types/community'

const PAGE_SIZE = 3

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all' as const, label: '전체' },
  ...CATEGORY_OPTIONS,
]

// 커뮤니티 목록 화면. 검색·인기 태그 롤링·탭·필터·게시글 카드·더보기를 담당한다.
export function CommunityPage() {
  const [query, setQuery] = useState('')
  const [searchTargets, setSearchTargets] = useState<CommunitySearchTargets>({
    titleContent: true,
    tags: true,
  })
  const [tab, setTab] = useState<CommunityTab>('recommend')
  const [category, setCategory] = useState<CommunityCategory | 'all'>('all')

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setLoadingMore] = useState(false)
  const [keywords, setKeywords] = useState<TrendingKeyword[]>([])

  // 필터가 연달아 바뀔 때 늦게 도착한 이전 응답이 목록을 덮어쓰지 않도록 요청에 번호를 매긴다.
  const requestId = useRef(0)

  // 현재 필터 조합과 마지막으로 로딩을 마친 조합이 다르면 로딩 중으로 본다.
  const listKey = `${tab}-${category}-${query}-${searchTargets.titleContent}-${searchTargets.tags}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const isLoadingList = loadedKey !== listKey

  useEffect(() => {
    let active = true
    fetchTrendingKeywords().then(
      (items) => {
        if (active) setKeywords(items)
      },
      () => {
        if (active) setKeywords([])
      },
    )
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const id = ++requestId.current
    fetchPosts({
      tab,
      category,
      offset: 0,
      limit: PAGE_SIZE,
      query,
      searchTargets,
    }).then(
      ({ items, hasMore: more }) => {
        if (id !== requestId.current) return
        setPosts(items)
        setHasMore(more)
        setLoadedKey(listKey)
      },
    )
  }, [tab, category, query, searchTargets, listKey])

  const loadMore = async () => {
    if (isLoadingMore) return
    setLoadingMore(true)
    const { items, hasMore: more } = await fetchPosts({
      tab,
      category,
      offset: posts.length,
      limit: PAGE_SIZE,
      query,
      searchTargets,
    })
    setPosts((prev) => [...prev, ...items])
    setHasMore(more)
    setLoadingMore(false)
  }

  // 북마크·좋아요는 낙관적으로 먼저 반영한다.
  const handleToggleBookmark = (target: CommunityPost) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === target.id ? { ...post, bookmarked: !post.bookmarked } : post,
      ),
    )
    void toggleBookmark(target.id, !target.bookmarked)
  }

  const handleToggleLike = (target: CommunityPost) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === target.id
          ? {
              ...post,
              liked: !post.liked,
              likeCount: post.likeCount + (post.liked ? -1 : 1),
            }
          : post,
      ),
    )
    void toggleLike(target.id, !target.liked)
  }

  return (
    <PageLayout contentClassName="page-content-zoom-90 max-w-dashboard px-4 sm:px-8">
      <PageTransition>
        {/* 헤더·푸터를 제외한 커뮤니티 본문 전체를 90% 크기로 축소해 표시한다. */}
        <div>
          {/* Hero */}
          <section className="grid items-center gap-8 border-b border-gold-500 py-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-14">
            <div>
              <h1 className="text-[32px] font-bold text-navy-900">커뮤니티</h1>
              <p className="mt-2 text-body-2 text-ink-500">
                오늘도 면접 준비의 모든 순간을 함께해요.
              </p>
              <div className="mt-6">
                <HeroSearch
                  value={query}
                  searchTargets={searchTargets}
                  onSearch={setQuery}
                  onSearchTargetsChange={setSearchTargets}
                />
              </div>
              <div className="mt-6">
                <TrendingKeywordTicker keywords={keywords} onSelect={setQuery} />
              </div>
            </div>
            <img
              src="/community/hero_image.png"
              alt="함께 면접을 준비하는 사람들 일러스트"
              className="hidden w-full md:block"
            />
          </section>

          {/* 오늘의 이야기 */}
          <section className="py-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-h2 font-bold text-navy-900">오늘의 이야기</h2>
              <Link
                to="/community/write"
                className="rounded-ait-s bg-navy-900 px-5 py-2.5 text-body-2 font-semibold text-surface-default transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-[.92]"
              >
                +  글쓰기
              </Link>
            </div>

            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <PostTabs value={tab} onChange={setTab} />
              <Dropdown
                options={CATEGORY_FILTER_OPTIONS}
                value={category}
                onChange={setCategory}
                ariaLabel="카테고리 필터"
                className="w-32"
              />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={listKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.16, ease: EASE_OUT } }}
                className="mt-6"
              >
                {isLoadingList ? (
                  <div className="flex flex-col gap-4">
                    {Array.from({ length: PAGE_SIZE }, (_, index) => (
                      <PostCardSkeleton key={index} />
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <p className="rounded-ait-m border border-line bg-surface-default py-16 text-center text-body-2 text-ink-500">
                    조건에 맞는 글이 없어요. 검색어나 필터를 바꿔보세요.
                  </p>
                ) : (
                  <motion.div
                    variants={listContainer}
                    initial="initial"
                    animate="animate"
                    className="flex flex-col gap-4"
                  >
                    {posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onToggleBookmark={handleToggleBookmark}
                        onToggleLike={handleToggleLike}
                      />
                    ))}
                    {isLoadingMore
                      ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                          <PostCardSkeleton key={`more-${index}`} />
                        ))
                      : null}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {!isLoadingList && posts.length > 0 ? (
              <div className="mt-6">
                <LoadMoreButton
                  hasMore={hasMore}
                  isLoading={isLoadingMore}
                  onClick={loadMore}
                />
              </div>
            ) : null}
          </section>
        </div>
      </PageTransition>
    </PageLayout>
  )
}

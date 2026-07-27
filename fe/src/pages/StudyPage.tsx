import { Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { MyStudySection } from '@/components/study/MyStudySection'
import { StudyApplicationModal } from '@/components/study/StudyApplicationModal'
import { StudyApplicationToast } from '@/components/study/StudyApplicationToast'
import { StudyApplyDialog } from '@/components/study/StudyApplyDialog'
import { StudyCardGrid } from '@/components/study/StudyCardGrid'
import { StudyChatFloatingButton } from '@/components/study/StudyChatFloatingButton'
import { StudyChatModal } from '@/components/study/StudyChatModal'
import { StudyCreateDialog } from '@/components/study/StudyCreateDialog'
import {
  StudySearchFilters,
  type RecruitmentFilter,
  type RoleFilter,
  type StudySort,
} from '@/components/study/StudySearchFilters'
import { Button } from '@/components/ui/button'
import {
  mockMyStudies,
  mockStudyCards,
  type StudyCardData,
} from '@/mocks/study-lounge'

const INITIAL_VISIBLE_STUDIES = 6
const LOAD_MORE_COUNT = 3

// 스터디 탐색부터 신청, 그룹 대화와 가입 관리까지 라운지 UI 흐름을 조합한다.
export function StudyPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleFilter>('전체')
  const [recruitment, setRecruitment] =
    useState<RecruitmentFilter>('all')
  const [sort, setSort] = useState<StudySort>('latest')
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_STUDIES)
  const [appliedStudyIds, setAppliedStudyIds] = useState<Set<number>>(
    () => new Set(),
  )
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [applicationTarget, setApplicationTarget] =
    useState<StudyCardData | null>(null)
  const applicationMessagesRef = useRef<Record<number, string>>({})

  const filteredStudies = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    const studies = mockStudyCards.filter((study) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          study.title,
          study.description,
          study.role,
          study.company ?? '',
        ].some((value) =>
          value.toLocaleLowerCase('ko-KR').includes(normalizedQuery),
        )
      const matchesRole = role === '전체' || study.role === role
      const matchesRecruitment =
        recruitment === 'all' ||
        (recruitment === 'recruiting' &&
          (study.recruitmentStatus === '모집 중' ||
            study.recruitmentStatus === '마감 임박')) ||
        (recruitment === 'pending' &&
          study.recruitmentStatus === '신청 대기') ||
        (recruitment === 'closed' && study.recruitmentStatus === '마감')

      return matchesQuery && matchesRole && matchesRecruitment
    })

    return studies.toSorted((first, second) => {
      if (sort === 'closing') {
        return (
          first.capacity -
          first.currentMembers -
          (second.capacity - second.currentMembers)
        )
      }
      if (sort === 'available') {
        return (
          second.capacity -
          second.currentMembers -
          (first.capacity - first.currentMembers)
        )
      }
      return second.createdOrder - first.createdOrder
    })
  }, [query, recruitment, role, sort])

  const visibleStudies = filteredStudies.slice(0, visibleCount)

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const resetVisibleCount = () => setVisibleCount(INITIAL_VISIBLE_STUDIES)

  const completeApplication = (message: string) => {
    if (!applicationTarget) return
    // TODO: 실제 API 연동 필요 — 신청 성공 응답을 받은 뒤 상태와 알림을 갱신한다.
    applicationMessagesRef.current[applicationTarget.id] = message
    setAppliedStudyIds((currentIds) =>
      new Set(currentIds).add(applicationTarget.id),
    )
    setApplicationTarget(null)
    setToastMessage('스터디 신청이 완료되었습니다.')
  }

  return (
    <PageLayout contentClassName="max-w-dashboard px-4 sm:px-8">
      <section
        className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between"
        aria-labelledby="page-title"
      >
        <div>
          <h1 id="page-title" className="text-h1 text-text-primary">
            면접스터디
          </h1>
          <p className="mt-2 text-body-2 text-text-secondary">
            함께 연습하고, 실전처럼 준비해요.
          </p>
        </div>

        <Button
          type="button"
          className="self-start"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          스터디 만들기
        </Button>
      </section>

      <MyStudySection
        studies={mockMyStudies}
        onEnterStudy={() => navigate('/study/session/prejoin')}
        onManageApplications={() => setIsApplicationModalOpen(true)}
      />

      <section
        className="mb-16 mt-8 border-t border-status-achievement pt-6"
        aria-labelledby="study-search-title"
      >
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 id="study-search-title" className="text-h3 text-text-primary">
            스터디 찾기
          </h2>
          <p className="text-caption text-text-secondary">
            총 {filteredStudies.length}개의 스터디
          </p>
        </div>

        <StudySearchFilters
          query={query}
          role={role}
          recruitment={recruitment}
          sort={sort}
          onQueryChange={(value) => {
            setQuery(value)
            resetVisibleCount()
          }}
          onRoleChange={(value) => {
            setRole(value)
            resetVisibleCount()
          }}
          onRecruitmentChange={(value) => {
            setRecruitment(value)
            resetVisibleCount()
          }}
          onSortChange={(value) => {
            setSort(value)
            resetVisibleCount()
          }}
        />

        <StudyCardGrid
          studies={visibleStudies}
          appliedStudyIds={appliedStudyIds}
          onApply={setApplicationTarget}
        />

        {visibleCount < filteredStudies.length ? (
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              className="min-w-56"
              onClick={() =>
                setVisibleCount((count) => count + LOAD_MORE_COUNT)
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              더보기
            </Button>
          </div>
        ) : null}
      </section>

      <StudyChatFloatingButton
        unreadCount={42}
        onClick={() => setIsChatOpen(true)}
      />
      <StudyChatModal open={isChatOpen} onOpenChange={setIsChatOpen} />
      <StudyApplicationModal
        open={isApplicationModalOpen}
        onOpenChange={setIsApplicationModalOpen}
      />
      <StudyCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={() =>
          setToastMessage('스터디 정보가 임시 저장되었습니다.')
        }
      />
      <StudyApplyDialog
        study={applicationTarget}
        open={applicationTarget !== null}
        onOpenChange={(open) => {
          if (!open) setApplicationTarget(null)
        }}
        onSubmit={completeApplication}
      />
      {toastMessage ? (
        <StudyApplicationToast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      ) : null}
    </PageLayout>
  )
}

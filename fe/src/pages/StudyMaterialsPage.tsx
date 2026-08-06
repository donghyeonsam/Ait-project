import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toErrorMessage } from '@/api/http'
import { getStudyGroupDetail } from '@/api/study-groups'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { SegmentedControl } from '@/components/form/SegmentedControl'
import { PageLayout } from '@/components/layout/PageLayout'
import { StudyMaterialFileList } from '@/components/study/materials/StudyMaterialFileList'
import { StudyMaterialImageGrid } from '@/components/study/materials/StudyMaterialImageGrid'
import { StudyMaterialImageViewerDialog } from '@/components/study/materials/StudyMaterialImageViewerDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastStack } from '@/components/ui/toast'
import { useToasts } from '@/lib/useToasts'
import {
  MOCK_STUDY_MATERIAL_FILES,
  MOCK_STUDY_MATERIAL_IMAGES,
} from '@/mocks/study-materials'
import type { StudyMaterialTab } from '@/types/study-materials'

// 스터디 그룹 자료실. 공유된 이미지는 모아보기 그리드로, 파일은 드라이브형 목록으로 보여준다.
export function StudyMaterialsPage() {
  const { studyId } = useParams()
  const navigate = useNavigate()
  const groupId = Number(studyId)
  const isValidGroupId = Number.isInteger(groupId) && groupId > 0

  const [groupTitle, setGroupTitle] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isValidGroupId)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<StudyMaterialTab>('image')
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const { toasts, showToast } = useToasts()

  // 자료 목록은 목업이지만 그룹 이름·접근 권한 확인은 기존 상세 API를 그대로 쓴다.
  useEffect(() => {
    if (!isValidGroupId) return

    let isActive = true
    getStudyGroupDetail(groupId)
      .then((detail) => {
        if (!isActive) return
        setGroupTitle(detail.title)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (isActive) setLoadError(toErrorMessage(error))
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [groupId, isValidGroupId])

  // TODO: 실제 API 연동 필요 — 그룹별 자료 목록 조회로 교체한다.
  const images = MOCK_STUDY_MATERIAL_IMAGES
  const files = MOCK_STUDY_MATERIAL_FILES

  // TODO: 실제 API 연동 필요 — 인증 다운로드(downloadPostFile 방식)로 교체한다.
  const handleDownload = () => {
    showToast('자료 다운로드는 서버 연동 후 제공될 예정이에요.')
  }

  if (!isValidGroupId || loadError) {
    return (
      <PageLayout contentClassName="max-w-dashboard px-4 sm:px-8 [zoom:0.9]">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-body-1 text-status-error" role="alert">
            {isValidGroupId
              ? loadError
              : '올바르지 않은 스터디 그룹입니다.'}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/study')}
          >
            스터디 라운지로 이동
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout contentClassName="max-w-dashboard px-4 sm:px-8 [zoom:0.9]">
      <section className="py-8" aria-labelledby="study-materials-title">
        <Breadcrumb
          items={[
            { label: '스터디 그룹', to: '/study' },
            { label: '내 스터디', to: `/study/groups/${groupId}` },
            { label: '자료실' },
          ]}
        />

        <div className="mt-10">
          <h1 id="study-materials-title" className="text-h1 text-text-primary">
            자료실
          </h1>
          {isLoading ? (
            <Skeleton className="mt-3 h-5 w-64" />
          ) : (
            <p className="mt-3 text-body-2 text-text-secondary">
              {groupTitle} 그룹에서 공유한 이미지와 파일을 한곳에서 모아봐요.
            </p>
          )}
        </div>

        <div className="mt-8">
          <SegmentedControl
            ariaLabel="자료 종류 선택"
            options={[
              { value: 'image', label: `이미지 ${images.length}` },
              { value: 'file', label: `파일 ${files.length}` },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        <div className="mt-6">
          {tab === 'image' ? (
            <StudyMaterialImageGrid images={images} onSelect={setViewerIndex} />
          ) : (
            <StudyMaterialFileList files={files} onDownload={handleDownload} />
          )}
        </div>
      </section>

      <StudyMaterialImageViewerDialog
        images={images}
        activeIndex={viewerIndex}
        onActiveIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        onDownload={handleDownload}
      />

      <ToastStack toasts={toasts} />
    </PageLayout>
  )
}

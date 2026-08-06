import type { Client } from '@stomp/stompjs'
import { Loader2, Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toErrorMessage } from '@/api/http'
import {
  connectStudyGroupChat,
  sendStudyGroupChatMessage,
  uploadStudyGroupChatFile,
} from '@/api/study-group-chat'
import { getStudyGroupDetail } from '@/api/study-groups'
import {
  downloadStudyMaterial,
  fetchStudyGroupMaterials,
  toStudyMaterialItem,
} from '@/api/study-materials'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { SegmentedControl } from '@/components/form/SegmentedControl'
import { PageLayout } from '@/components/layout/PageLayout'
import { StudyMaterialFileList } from '@/components/study/materials/StudyMaterialFileList'
import { StudyMaterialImageGrid } from '@/components/study/materials/StudyMaterialImageGrid'
import { StudyMaterialImageViewerDialog } from '@/components/study/materials/StudyMaterialImageViewerDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastStack } from '@/components/ui/toast'
import { toFileToken } from '@/lib/study-chat-file'
import { useToasts } from '@/lib/useToasts'
import type {
  StudyMaterialItem,
  StudyMaterialTab,
} from '@/types/study-materials'

// 스터디 그룹 자료실. 그룹톡에 공유된 이미지는 모아보기 그리드로, 파일은 드라이브형 목록으로 보여준다.
export function StudyMaterialsPage() {
  const { studyId } = useParams()
  const navigate = useNavigate()
  const groupId = Number(studyId)
  const isValidGroupId = Number.isInteger(groupId) && groupId > 0

  const [groupTitle, setGroupTitle] = useState<string | null>(null)
  const [isLoadingGroup, setIsLoadingGroup] = useState(isValidGroupId)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [materials, setMaterials] = useState<StudyMaterialItem[]>([])
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(isValidGroupId)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [materialsError, setMaterialsError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  // 다음 조회에 넘길 그룹톡 커서. 이 chatId보다 오래된 메시지를 이어서 훑는다.
  const cursorRef = useRef<number | undefined>(undefined)

  const [tab, setTab] = useState<StudyMaterialTab>('image')
  // 실시간 수신으로 배열 인덱스가 밀려도 보던 이미지가 유지되도록 뷰어는 id로 추적한다.
  const [viewerImageId, setViewerImageId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  // 업로드한 자료를 그룹톡 파일 토큰 메시지로 보내기 위한 STOMP 클라이언트.
  const chatClientRef = useRef<Client | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toasts, showToast } = useToasts()

  // 그룹 이름·접근 권한 확인은 기존 상세 API를 그대로 쓴다.
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
        if (isActive) setIsLoadingGroup(false)
      })

    return () => {
      isActive = false
    }
  }, [groupId, isValidGroupId])

  // 전용 자료실 API가 없어 그룹톡 히스토리에서 첨부를 걸러 최신순으로 쌓는다.
  useEffect(() => {
    if (!isValidGroupId) return

    let isActive = true

    const loadInitialMaterials = async () => {
      cursorRef.current = undefined
      setMaterials([])
      setIsLoadingMaterials(true)
      setMaterialsError(null)
      try {
        const page = await fetchStudyGroupMaterials(groupId)
        if (!isActive) return
        // 조회 중 실시간으로 받은 자료는 히스토리보다 최신이므로 중복만 걸러 앞에 유지한다.
        setMaterials((current) => {
          const loadedIds = new Set(page.items.map((item) => item.id))
          const liveOnly = current.filter((item) => !loadedIds.has(item.id))
          return [...liveOnly, ...page.items]
        })
        setHasMore(page.hasNext)
        cursorRef.current = page.lastChatId ?? undefined
      } catch (error) {
        if (isActive) setMaterialsError(toErrorMessage(error))
      } finally {
        if (isActive) setIsLoadingMaterials(false)
      }
    }

    void loadInitialMaterials()

    return () => {
      isActive = false
    }
  }, [groupId, isValidGroupId])

  // 업로드 전송과 다른 구성원의 새 첨부 실시간 반영을 위해 그룹톡 STOMP 연결을 연다.
  useEffect(() => {
    if (!isValidGroupId) return

    const client = connectStudyGroupChat(groupId, {
      onMessage: (incoming) => {
        const item = toStudyMaterialItem(incoming)
        if (!item) return
        setMaterials((current) =>
          current.some((material) => material.id === item.id)
            ? current
            : [item, ...current],
        )
      },
      onNotice: () => {},
      onReaction: () => {},
    })
    chatClientRef.current = client

    return () => {
      chatClientRef.current = null
      void client.deactivate()
    }
  }, [groupId, isValidGroupId])

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    fetchStudyGroupMaterials(groupId, cursorRef.current)
      .then((page) => {
        setMaterials((current) => [...current, ...page.items])
        setHasMore(page.hasNext)
        cursorRef.current = page.lastChatId ?? undefined
      })
      .catch(() => {
        showToast('자료를 더 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      })
      .finally(() => setIsLoadingMore(false))
  }, [groupId, hasMore, isLoadingMore, showToast])

  const images = useMemo(
    () => materials.filter((item) => item.isImage),
    [materials],
  )
  const files = useMemo(
    () => materials.filter((item) => !item.isImage),
    [materials],
  )

  const viewerIndex = useMemo(() => {
    if (viewerImageId === null) return null
    const index = images.findIndex((image) => image.id === viewerImageId)
    return index >= 0 ? index : null
  }, [images, viewerImageId])

  const handleDownload = async (item: StudyMaterialItem) => {
    try {
      await downloadStudyMaterial(item)
    } catch {
      showToast('자료를 다운로드하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  // 파일은 공용 업로드 API에 올린 뒤 그룹톡 파일 토큰 메시지로 전송해 저장한다.
  // 목록 반영은 서버가 되돌려주는 실시간 메시지 수신으로 처리한다.
  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    // 같은 파일을 다시 골라도 change 이벤트가 발생하도록 입력 값을 비운다.
    event.target.value = ''
    if (selected.length === 0 || isUploading) return
    if (!chatClientRef.current?.connected) {
      showToast('그룹톡 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.')
      return
    }

    setIsUploading(true)
    let failedCount = 0
    for (const file of selected) {
      try {
        const storedFilename = await uploadStudyGroupChatFile(file)
        const client = chatClientRef.current
        if (!client?.connected) throw new Error('연결이 끊겼습니다.')
        sendStudyGroupChatMessage(
          client,
          groupId,
          toFileToken(storedFilename, file.name),
        )
      } catch {
        failedCount += 1
      }
    }
    setIsUploading(false)
    if (failedCount > 0) {
      showToast(
        `파일 ${failedCount}개를 올리지 못했어요. 잠시 후 다시 시도해주세요.`,
      )
    }
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

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 id="study-materials-title" className="text-h1 text-text-primary">
              자료실
            </h1>
            {isLoadingGroup ? (
              <Skeleton className="mt-3 h-5 w-64" />
            ) : (
              <p className="mt-3 text-body-2 text-text-secondary">
                {groupTitle} 그룹톡에서 공유한 이미지와 파일을 한곳에서 모아봐요.
              </p>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => void handleUploadChange(event)}
            />
            <Button
              type="button"
              disabled={isUploading}
              aria-busy={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  올리는 중
                </>
              ) : (
                <>
                  <Upload aria-hidden="true" className="size-4" />
                  자료 올리기
                </>
              )}
            </Button>
          </div>
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
          {isLoadingMaterials ? (
            <div
              className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5"
              role="status"
              aria-label="자료를 불러오는 중"
            >
              {Array.from({ length: 10 }, (_, index) => (
                <Skeleton key={index} className="aspect-square" />
              ))}
            </div>
          ) : materialsError ? (
            <div className="flex flex-col items-center gap-4 rounded-ait-m border border-border-default bg-surface-default py-16 text-center">
              <p className="text-body-1 text-status-error" role="alert">
                {materialsError}
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(0)}
              >
                다시 불러오기
              </Button>
            </div>
          ) : (
            <>
              {tab === 'image' ? (
                <StudyMaterialImageGrid
                  images={images}
                  onSelect={(image) => setViewerImageId(image.id)}
                />
              ) : (
                <StudyMaterialFileList
                  files={files}
                  onDownload={(file) => void handleDownload(file)}
                />
              )}
              {hasMore ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isLoadingMore}
                    aria-busy={isLoadingMore}
                    onClick={loadMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                        불러오는 중
                      </>
                    ) : (
                      '이전 자료 더 불러오기'
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <StudyMaterialImageViewerDialog
        images={images}
        activeIndex={viewerIndex}
        onActiveIndexChange={(index) =>
          setViewerImageId(images[index]?.id ?? null)
        }
        onClose={() => setViewerImageId(null)}
        onDownload={(image) => void handleDownload(image)}
      />

      <ToastStack toasts={toasts} />
    </PageLayout>
  )
}

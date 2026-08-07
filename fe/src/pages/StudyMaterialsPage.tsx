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
import { StudyMaterialFilters } from '@/components/study/materials/StudyMaterialFilters'
import { StudyMaterialImageGrid } from '@/components/study/materials/StudyMaterialImageGrid'
import { StudyMaterialImageViewerDialog } from '@/components/study/materials/StudyMaterialImageViewerDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastStack } from '@/components/ui/toast'
import { parseFileToken, toFileToken } from '@/lib/study-chat-file'
import { useAuth } from '@/lib/useAuth'
import { useToasts } from '@/lib/useToasts'
import type {
  StudyMaterialItem,
  StudyMaterialTab,
} from '@/types/study-materials'

// 서버 에코 도착 전에 목록에 먼저 넣는 임시 자료의 id. 저장 파일명이 서버 생성 유일값이라 매칭 키로 쓴다.
function toPendingId(storedFilename: string) {
  return `pending-${storedFilename}`
}

// 스터디 그룹 자료실. 그룹톡에 공유된 이미지는 모아보기 그리드로, 파일은 드라이브형 목록으로 보여준다.
export function StudyMaterialsPage() {
  const { studyId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
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
  const [query, setQuery] = useState('')
  // 올린 사람 필터. 빈 문자열이면 전체를 뜻한다.
  const [uploader, setUploader] = useState('')
  // 실시간 수신으로 배열 인덱스가 밀려도 보던 이미지가 유지되도록 뷰어는 id로 추적한다.
  const [viewerImageId, setViewerImageId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  // 다운로드 중인 자료 id 집합. 큰 파일에서 무반응처럼 보이거나 연타되는 것을 막는다.
  const [downloadingIds, setDownloadingIds] = useState<ReadonlySet<string>>(
    new Set(),
  )
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
        const pendingId = toPendingId(item.storedFilename)
        // 뷰어가 임시 항목을 보고 있으면 교체될 실제 id로 옮겨 뷰어가 닫히지 않게 한다.
        setViewerImageId((activeId) =>
          activeId === pendingId ? item.id : activeId,
        )
        setMaterials((current) => {
          if (current.some((material) => material.id === item.id)) return current
          // 내가 올린 자료의 서버 에코면 새로 추가하지 않고 임시 항목을 실제 항목으로 교체한다.
          if (current.some((material) => material.id === pendingId)) {
            return current.map((material) =>
              material.id === pendingId ? item : material,
            )
          }
          return [item, ...current]
        })
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
        // 불러온 자료가 다른 탭에만 쌓이면 버튼이 무반응처럼 보여 결과 위치를 알려준다.
        const addedToTab = page.items.filter(
          (item) => item.isImage === (tab === 'image'),
        ).length
        if (page.items.length === 0) {
          showToast('이 구간의 그룹톡에는 공유된 자료가 없었어요.')
        } else if (addedToTab === 0) {
          showToast(
            tab === 'image'
              ? '새로 불러온 자료가 모두 파일이에요. 파일 탭에서 확인해보세요.'
              : '새로 불러온 자료가 모두 이미지예요. 이미지 탭에서 확인해보세요.',
          )
        }
      })
      .catch(() => {
        showToast('자료를 더 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      })
      .finally(() => setIsLoadingMore(false))
  }, [groupId, hasMore, isLoadingMore, showToast, tab])

  const uploaderOptions = useMemo(
    () => [...new Set(materials.map((item) => item.uploaderNickname))],
    [materials],
  )

  const normalizedQuery = query.trim().toLowerCase()
  const isFiltering = normalizedQuery !== '' || uploader !== ''
  const filteredMaterials = useMemo(
    () =>
      materials.filter(
        (item) =>
          (normalizedQuery === '' ||
            item.originalFilename.toLowerCase().includes(normalizedQuery)) &&
          (uploader === '' || item.uploaderNickname === uploader),
      ),
    [materials, normalizedQuery, uploader],
  )

  const images = useMemo(
    () => filteredMaterials.filter((item) => item.isImage),
    [filteredMaterials],
  )
  const files = useMemo(
    () => filteredMaterials.filter((item) => !item.isImage),
    [filteredMaterials],
  )

  const viewerIndex = useMemo(() => {
    if (viewerImageId === null) return null
    const index = images.findIndex((image) => image.id === viewerImageId)
    return index >= 0 ? index : null
  }, [images, viewerImageId])

  const handleDownload = async (item: StudyMaterialItem) => {
    if (downloadingIds.has(item.id)) return
    setDownloadingIds((current) => new Set(current).add(item.id))
    try {
      await downloadStudyMaterial(item)
    } catch {
      showToast('자료를 다운로드하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setDownloadingIds((current) => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
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
    let uploadedCount = 0
    let failedCount = 0
    for (const file of selected) {
      try {
        const storedFilename = await uploadStudyGroupChatFile(file)
        const client = chatClientRef.current
        if (!client?.connected) throw new Error('연결이 끊겼습니다.')
        const token = toFileToken(storedFilename, file.name)
        sendStudyGroupChatMessage(client, groupId, token)
        uploadedCount += 1
        // 서버 에코를 기다리지 않고 임시 항목을 먼저 넣어 방금 올린 자료가 바로 보이게 한다.
        // 표시 규칙(파일명 자르기·URL·이미지 판별)이 에코와 어긋나지 않도록 같은 토큰을 되파싱한다.
        const attachment = parseFileToken(token)
        if (attachment) {
          const pendingItem: StudyMaterialItem = {
            id: toPendingId(attachment.storedFilename),
            storedFilename: attachment.storedFilename,
            originalFilename: attachment.originalFilename,
            url: attachment.url,
            isImage: attachment.isImage,
            uploaderNickname: user?.nickname ?? '',
            createdAt: new Date().toISOString(),
          }
          setMaterials((current) => [pendingItem, ...current])
        }
      } catch {
        failedCount += 1
      }
    }
    setIsUploading(false)
    if (uploadedCount > 0) {
      showToast(`파일 ${uploadedCount}개를 올렸어요.`)
    }
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

        <div className="mt-4">
          <StudyMaterialFilters
            query={query}
            uploader={uploader}
            uploaderOptions={uploaderOptions}
            onQueryChange={setQuery}
            onUploaderChange={setUploader}
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
              {/* 필터 결과 없음은 자료 자체가 없는 빈 상태와 구분해 조건 변경을 안내한다. */}
              {isFiltering && (tab === 'image' ? images : files).length === 0 ? (
                <div className="rounded-ait-m border border-border-default bg-surface-default py-16 text-center">
                  <p className="text-body-1 text-text-primary">
                    조건에 맞는 자료가 없어요
                  </p>
                  <p className="mt-2 text-body-2 text-text-secondary">
                    {hasMore
                      ? '검색은 지금까지 불러온 자료에만 적용돼요. 조건을 바꾸거나 이전 자료를 더 불러온 뒤 다시 찾아보세요.'
                      : '검색어나 올린 사람 조건을 바꿔보세요.'}
                  </p>
                </div>
              ) : tab === 'image' ? (
                <StudyMaterialImageGrid
                  images={images}
                  onSelect={(image) => setViewerImageId(image.id)}
                />
              ) : (
                <StudyMaterialFileList
                  files={files}
                  downloadingIds={downloadingIds}
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
        isDownloading={
          viewerImageId !== null && downloadingIds.has(viewerImageId)
        }
        onDownload={(image) => void handleDownload(image)}
      />

      <ToastStack toasts={toasts} />
    </PageLayout>
  )
}

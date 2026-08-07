import type { Client } from '@stomp/stompjs'
import { Loader2, Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toErrorMessage } from '@/api/http'
import {
  connectStudyGroupChat,
  sendStudyGroupChatFileMessage,
  uploadStudyGroupChatFiles,
} from '@/api/study-group-chat'
import { getStudyGroupDetail } from '@/api/study-groups'
import {
  downloadStudyMaterial,
  fetchStudyGroupMaterials,
  toStudyMaterialItems,
  type StudyMaterialsSource,
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
import {
  fromStudyGroupChatFile,
  toStudyGroupChatFile,
} from '@/lib/study-chat-file'
import { useAuth } from '@/lib/useAuth'
import { useToasts } from '@/lib/useToasts'
import type {
  StudyMaterialItem,
  StudyMaterialTab,
} from '@/types/study-materials'

// 탭 하나가 서버 페이지네이션을 독립적으로 진행하기 위한 상태 묶음.
interface MaterialsTabState {
  items: StudyMaterialItem[]
  // null이면 더 불러올 자료가 없다.
  nextSource: StudyMaterialsSource | null
  // 전용 API가 알려준 종류별 전체 개수. legacy(과거 토큰) 자료는 포함하지 않는다.
  totalCount: number | null
}

const emptyTabState: MaterialsTabState = {
  items: [],
  nextSource: null,
  totalCount: null,
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

  const [imageTab, setImageTab] = useState<MaterialsTabState>(emptyTabState)
  const [fileTab, setFileTab] = useState<MaterialsTabState>(emptyTabState)
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(isValidGroupId)
  const [loadingMoreTab, setLoadingMoreTab] = useState<StudyMaterialTab | null>(
    null,
  )
  const [materialsError, setMaterialsError] = useState<string | null>(null)
  // 조회 실패 시 페이지 전체를 새로고침하지 않고 자료 조회 이펙트만 다시 돌리는 키.
  const [materialsReloadKey, setMaterialsReloadKey] = useState(0)

  const [tab, setTab] = useState<StudyMaterialTab>('image')
  const [query, setQuery] = useState('')
  // 올린 사람 필터. 빈 문자열이면 전체를 뜻한다.
  const [uploader, setUploader] = useState('')
  // 실시간 수신으로 배열 인덱스가 밀려도 보던 이미지가 유지되도록 뷰어는 id로 추적한다.
  const [viewerImageId, setViewerImageId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  // 자식 요소를 오갈 때 dragleave가 연달아 발생해도 드롭 안내가 깜빡이지 않도록 깊이를 센다.
  const dragDepthRef = useRef(0)
  // 다운로드 중인 자료 id 집합. 큰 파일에서 무반응처럼 보이거나 연타되는 것을 막는다.
  const [downloadingIds, setDownloadingIds] = useState<ReadonlySet<string>>(
    new Set(),
  )
  // 업로드한 자료를 그룹톡 FILE 메시지로 보내기 위한 STOMP 클라이언트.
  const chatClientRef = useRef<Client | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toasts, showToast } = useToasts()

  const setTabState = (
    kind: StudyMaterialTab,
    updater: (current: MaterialsTabState) => MaterialsTabState,
  ) => {
    if (kind === 'image') setImageTab(updater)
    else setFileTab(updater)
  }

  // 실시간 수신·업로드 직후 반영에 함께 쓰는 삽입. 같은 자료(id)는 한 번만 넣고 전체 개수도 맞춘다.
  const insertMaterial = (item: StudyMaterialItem) => {
    setTabState(item.isImage ? 'image' : 'file', (current) => {
      if (current.items.some((material) => material.id === item.id)) {
        return current
      }
      return {
        ...current,
        items: [item, ...current.items],
        totalCount:
          current.totalCount === null ? null : current.totalCount + 1,
      }
    })
  }

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

  // 이미지·파일 탭의 첫 페이지를 동시에 불러온다.
  useEffect(() => {
    if (!isValidGroupId) return

    let isActive = true

    const loadInitialMaterials = async () => {
      setImageTab(emptyTabState)
      setFileTab(emptyTabState)
      setIsLoadingMaterials(true)
      setMaterialsError(null)
      try {
        const [imagesPage, filesPage] = await Promise.all([
          fetchStudyGroupMaterials(groupId, 'image'),
          fetchStudyGroupMaterials(groupId, 'file'),
        ])
        if (!isActive) return
        // 조회 중 실시간으로 받은 자료는 히스토리보다 최신이므로 중복만 걸러 앞에 유지한다.
        for (const [kind, page] of [
          ['image', imagesPage],
          ['file', filesPage],
        ] as const) {
          setTabState(kind, (current) => {
            const loadedIds = new Set(page.items.map((item) => item.id))
            const liveOnly = current.items.filter(
              (item) => !loadedIds.has(item.id),
            )
            return {
              items: [...liveOnly, ...page.items],
              nextSource: page.nextSource,
              totalCount:
                page.totalCount === null
                  ? null
                  : page.totalCount + liveOnly.length,
            }
          })
        }
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
  }, [groupId, isValidGroupId, materialsReloadKey])

  // 업로드 전송과 다른 구성원의 새 첨부 실시간 반영을 위해 그룹톡 STOMP 연결을 연다.
  useEffect(() => {
    if (!isValidGroupId) return

    const client = connectStudyGroupChat(groupId, {
      onMessage: (incoming) => {
        for (const item of toStudyMaterialItems(incoming)) {
          insertMaterial(item)
        }
      },
      onNotice: () => {},
      onReaction: () => {},
    })
    chatClientRef.current = client

    return () => {
      chatClientRef.current = null
      void client.deactivate()
    }
    // insertMaterial은 상태 setter만 쓰므로 연결을 다시 만들 이유가 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, isValidGroupId])

  const loadMore = (kind: StudyMaterialTab) => {
    const tabState = kind === 'image' ? imageTab : fileTab
    if (loadingMoreTab !== null || !tabState.nextSource) return

    setLoadingMoreTab(kind)
    fetchStudyGroupMaterials(groupId, kind, tabState.nextSource)
      .then((page) => {
        setTabState(kind, (current) => {
          const knownIds = new Set(current.items.map((item) => item.id))
          return {
            items: [
              ...current.items,
              ...page.items.filter((item) => !knownIds.has(item.id)),
            ],
            nextSource: page.nextSource,
            totalCount: page.totalCount ?? current.totalCount,
          }
        })
        // 과거 토큰 스캔 구간은 빈 손으로 끝날 수 있어 버튼이 무반응처럼 보이지 않게 알린다.
        if (page.items.length === 0 && page.nextSource) {
          showToast('이 구간에서는 자료를 찾지 못했어요. 한 번 더 불러와보세요.')
        }
      })
      .catch(() => {
        showToast('자료를 더 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      })
      .finally(() => setLoadingMoreTab(null))
  }

  const uploaderOptions = useMemo(
    () => [
      ...new Set(
        [...imageTab.items, ...fileTab.items].map(
          (item) => item.uploaderNickname,
        ),
      ),
    ],
    [imageTab.items, fileTab.items],
  )

  const normalizedQuery = query.trim().toLowerCase()
  const isFiltering = normalizedQuery !== '' || uploader !== ''
  const matchesFilters = (item: StudyMaterialItem) =>
    (normalizedQuery === '' ||
      item.originalFilename.toLowerCase().includes(normalizedQuery)) &&
    (uploader === '' || item.uploaderNickname === uploader)

  const images = useMemo(
    () => imageTab.items.filter(matchesFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imageTab.items, normalizedQuery, uploader],
  )
  const files = useMemo(
    () => fileTab.items.filter(matchesFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fileTab.items, normalizedQuery, uploader],
  )

  // 필터 중에는 걸러진 개수를, 평소에는 서버 전체 개수(과거 자료를 더 불러왔으면 그 이상)를 보여준다.
  const imageCount = isFiltering
    ? images.length
    : Math.max(imageTab.totalCount ?? 0, imageTab.items.length)
  const fileCount = isFiltering
    ? files.length
    : Math.max(fileTab.totalCount ?? 0, fileTab.items.length)

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

  // 파일은 채팅 전용 업로드 API에 한 번에 올린 뒤 그룹톡 FILE 메시지 하나로 전송해 저장한다.
  // 버튼 선택과 드래그 앤 드롭이 같은 경로를 쓴다.
  const uploadFiles = async (selected: File[]) => {
    if (selected.length === 0 || isUploading) return
    if (!chatClientRef.current?.connected) {
      showToast('그룹톡 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.')
      return
    }

    setIsUploading(true)
    try {
      const storedFilenames = await uploadStudyGroupChatFiles(selected)
      const client = chatClientRef.current
      if (!client?.connected) throw new Error('연결이 끊겼습니다.')
      const chatFiles = storedFilenames.map((storedFilename, index) =>
        toStudyGroupChatFile(storedFilename, selected[index]),
      )
      sendStudyGroupChatFileMessage(client, groupId, chatFiles)
      // 서버 에코를 기다리지 않고 먼저 목록에 넣는다. 에코는 같은 id라 중복 삽입되지 않는다.
      const uploadedAt = new Date().toISOString()
      for (const chatFile of chatFiles) {
        const attachment = fromStudyGroupChatFile(chatFile)
        insertMaterial({
          id: attachment.storedFilename,
          storedFilename: attachment.storedFilename,
          originalFilename: attachment.originalFilename,
          url: attachment.url,
          isImage: attachment.isImage,
          fileSize: chatFile.fileSize,
          uploaderNickname: user?.nickname ?? '',
          createdAt: uploadedAt,
        })
      }
      showToast(`파일 ${selected.length}개를 올렸어요.`)
    } catch {
      showToast('파일을 올리지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    // 같은 파일을 다시 골라도 change 이벤트가 발생하도록 입력 값을 비운다.
    event.target.value = ''
    await uploadFiles(selected)
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

  const activeTabState = tab === 'image' ? imageTab : fileTab
  const activeItems = tab === 'image' ? images : files

  return (
    <PageLayout contentClassName="max-w-dashboard px-4 sm:px-8 [zoom:0.9]">
      {/* 파일 드래그가 감지되면 섹션 전체가 드롭 영역이 된다. */}
      <section
        className="relative py-8"
        aria-labelledby="study-materials-title"
        onDragEnter={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return
          event.preventDefault()
          dragDepthRef.current += 1
          setIsDragOver(true)
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes('Files')) event.preventDefault()
        }}
        onDragLeave={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return
          dragDepthRef.current -= 1
          if (dragDepthRef.current <= 0) {
            dragDepthRef.current = 0
            setIsDragOver(false)
          }
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return
          event.preventDefault()
          dragDepthRef.current = 0
          setIsDragOver(false)
          void uploadFiles(Array.from(event.dataTransfer.files))
        }}
      >
        {isDragOver ? (
          <div className="pointer-events-none absolute inset-0 z-(--z-index-overlay) flex items-center justify-center rounded-ait-m border-2 border-dashed border-action-primary bg-surface-default/85">
            <p className="flex items-center gap-2 text-body-1 font-semibold text-action-primary">
              <Upload aria-hidden="true" className="size-5" />
              여기에 놓으면 그룹톡에 공유되며 자료실에 올라가요
            </p>
          </div>
        ) : null}
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
              { value: 'image', label: `이미지 ${imageCount}` },
              { value: 'file', label: `파일 ${fileCount}` },
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
                onClick={() => setMaterialsReloadKey((key) => key + 1)}
              >
                다시 불러오기
              </Button>
            </div>
          ) : (
            <>
              {/* 필터 결과 없음은 자료 자체가 없는 빈 상태와 구분해 조건 변경을 안내한다. */}
              {isFiltering && activeItems.length === 0 ? (
                <div className="rounded-ait-m border border-border-default bg-surface-default py-16 text-center">
                  <p className="text-body-1 text-text-primary">
                    조건에 맞는 자료가 없어요
                  </p>
                  <p className="mt-2 text-body-2 text-text-secondary">
                    {activeTabState.nextSource
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
              {activeTabState.nextSource ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={loadingMoreTab !== null}
                    aria-busy={loadingMoreTab === tab}
                    onClick={() => loadMore(tab)}
                  >
                    {loadingMoreTab === tab ? (
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

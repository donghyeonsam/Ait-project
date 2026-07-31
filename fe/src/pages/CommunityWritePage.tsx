import type { Editor } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, PenLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createPost,
  fetchPost,
  updatePost,
  uploadPostFiles,
} from '@/api/community'
import { toErrorMessage } from '@/api/http'
import { PageTransition } from '@/components/common/PageTransition'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { FileDropzone } from '@/components/form/FileDropzone'
import { SegmentedControl } from '@/components/form/SegmentedControl'
import { TagInput } from '@/components/form/TagInput'
import { Toggle } from '@/components/form/Toggle'
import { PageLayout } from '@/components/layout/PageLayout'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dropdown } from '@/components/ui/dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastStack } from '@/components/ui/toast'
import { CATEGORY_OPTIONS } from '@/lib/community-categories'
import { COMMUNITY_TAG_SUGGESTIONS } from '@/lib/community-suggestions'
import { formatRelativeTime } from '@/lib/format'
import { collapseSection } from '@/lib/motion'
import { useAuth } from '@/lib/useAuth'
import { useToasts } from '@/lib/useToasts'
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChangesGuard'
import { cn } from '@/lib/utils'
import type {
  CommunityCategory,
  CommunityPostDraft,
  CommunityPostFile,
} from '@/types/community'

const TITLE_MAX = 50
const TITLE_WARN = 45
const CONTENT_MIN = 10
const DRAFT_KEY = 'ait-community-write-draft'
const AUTOSAVE_INTERVAL_MS = 30_000

// 게시판별 내용 placeholder. 미선택 시 기본 문구를 쓴다.
const CONTENT_PLACEHOLDERS: Record<CommunityCategory | 'default', string[]> = {
  default: [
    '면접 경험이나 도움이 되었던 팁을 자유롭게 작성해주세요.',
    '기업명, 면접 질문 등 개인정보가 포함되지 않도록 주의해주세요.',
  ],
  review: [
    '면접 진행 방식과 분위기, 준비하며 도움이 됐던 점을 공유해주세요.',
    '기업명, 면접 질문 등 개인정보가 포함되지 않도록 주의해주세요.',
  ],
  qna: [
    '궁금한 내용을 구체적으로 질문해주세요.',
    '상황과 맥락을 함께 적으면 더 정확한 답변을 받을 수 있어요.',
  ],
  tip: [
    '면접 경험이나 도움이 되었던 팁을 자유롭게 작성해주세요.',
    '기업명, 면접 질문 등 개인정보가 포함되지 않도록 주의해주세요.',
  ],
  study: [
    '스터디 목표와 진행 방식, 모집 인원을 알려주세요.',
    '진행 일정과 참여 방법도 함께 적으면 좋아요.',
  ],
}

interface DraftPayload {
  category: CommunityCategory | null
  title: string
  contentHtml: string
  tags: string[]
  visibility: 'public' | 'members'
  files: CommunityPostFile[]
  allowComments: boolean
  notify: boolean
  savedAt: string
}

type FieldName = 'category' | 'title' | 'content'

type EditLoadState = 'loading' | 'ready' | 'not-found' | 'forbidden'

const htmlToPlainText = (html: string) =>
  new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''

// 게시글 작성·수정 화면. 같은 폼에서 새 글과 기존 글의 입력·검증·저장을 처리한다.
export function CommunityWritePage() {
  const { postId } = useParams<{ postId: string }>()
  const isEditMode = Boolean(postId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUserNickname = user?.nickname
  const { toasts, showToast } = useToasts()
  const [editLoadState, setEditLoadState] = useState<EditLoadState>(
    isEditMode ? 'loading' : 'ready',
  )
  const [editBaseline, setEditBaseline] = useState<string | null>(null)

  const [category, setCategory] = useState<CommunityCategory | null>(null)
  const [title, setTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [contentText, setContentText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [postFiles, setPostFiles] = useState<CommunityPostFile[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<'public' | 'members'>('public')
  const [allowComments, setAllowComments] = useState(true)
  const [notify, setNotify] = useState(true)

  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [shakeField, setShakeField] = useState<FieldName | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  // 재진입 시 저장된 초안이 있으면 이어쓰기 배너를 보여준다.
  const [pendingDraft, setPendingDraft] = useState<DraftPayload | null>(() => {
    if (isEditMode) return null
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      return raw ? (JSON.parse(raw) as DraftPayload) : null
    } catch {
      localStorage.removeItem(DRAFT_KEY)
      return null
    }
  })

  const editorRef = useRef<Editor | null>(null)
  const categoryFieldRef = useRef<HTMLDivElement>(null)
  const titleFieldRef = useRef<HTMLDivElement>(null)
  const contentFieldRef = useRef<HTMLDivElement>(null)

  const formSnapshot = JSON.stringify({
    category,
    title,
    contentHtml,
    tags,
    visibility,
    files: postFiles.map(({ storedFilename, usageType }) => ({
      storedFilename,
      usageType,
    })),
    allowComments,
    notify,
  })
  const isDirty = isEditMode
    ? (editBaseline !== null && formSnapshot !== editBaseline) || files.length > 0
    : category !== null ||
      title.trim().length > 0 ||
      contentText.trim().length > 0 ||
      tags.length > 0 ||
      postFiles.length > 0 ||
      files.length > 0

  const guard = useUnsavedChangesGuard(isDirty && !isSubmitting)

  useEffect(() => {
    if (!isEditMode || !postId) return
    let cancelled = false

    fetchPost(postId)
      .then((post) => {
        if (cancelled) return
        if (!post) {
          setEditLoadState('not-found')
          return
        }
        if (!currentUserNickname || post.author !== currentUserNickname) {
          setEditLoadState('forbidden')
          return
        }

        const nextForm = {
          category: post.category,
          title: post.title,
          contentHtml: post.contentHtml,
          tags: post.tags,
          visibility: post.visibility ?? ('public' as const),
          files: post.files ?? [],
          allowComments: post.allowComments ?? true,
          notify: post.notify ?? true,
        }
        setCategory(nextForm.category)
        setTitle(nextForm.title)
        setContentHtml(nextForm.contentHtml)
        setContentText(htmlToPlainText(nextForm.contentHtml))
        setTags(nextForm.tags)
        setVisibility(nextForm.visibility)
        setPostFiles(nextForm.files)
        setAllowComments(nextForm.allowComments)
        setNotify(nextForm.notify)
        setEditBaseline(
          JSON.stringify({
            ...nextForm,
            files: nextForm.files.map(({ storedFilename, usageType }) => ({
              storedFilename,
              usageType,
            })),
          }),
        )
        setEditLoadState('ready')
      })
      // 조회 실패도 무한 로딩 대신 찾을 수 없음 안내로 처리한다.
      .catch(() => {
        if (!cancelled) setEditLoadState('not-found')
      })

    return () => {
      cancelled = true
    }
  }, [currentUserNickname, isEditMode, postId])

  const buildDraft = useCallback(
    (): DraftPayload => ({
      category,
      title,
      contentHtml,
      tags,
      visibility,
      files: postFiles,
      allowComments,
      notify,
      savedAt: new Date().toISOString(),
    }),
    [
      category,
      title,
      contentHtml,
      tags,
      visibility,
      postFiles,
      allowComments,
      notify,
    ],
  )

  // 자동 저장 타이머가 항상 최신 상태를 읽도록 렌더 후에 ref를 갱신한다.
  const draftRef = useRef(buildDraft)
  const isDirtyRef = useRef(isDirty)
  useEffect(() => {
    draftRef.current = buildDraft
    isDirtyRef.current = isDirty
  })

  // 30초마다 작성 중인 내용을 자동 저장한다.
  useEffect(() => {
    if (isEditMode) return
    const timer = setInterval(() => {
      if (isDirtyRef.current) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftRef.current()))
      }
    }, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isEditMode])

  // 브라우저 이탈(새로고침·탭 닫기)도 확인을 거친다.
  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const resumeDraft = () => {
    if (!pendingDraft) return
    setCategory(pendingDraft.category)
    setTitle(pendingDraft.title)
    setTags(pendingDraft.tags)
    setVisibility(pendingDraft.visibility)
    setPostFiles(pendingDraft.files ?? [])
    setAllowComments(pendingDraft.allowComments)
    setNotify(pendingDraft.notify)
    setContentHtml(pendingDraft.contentHtml)
    editorRef.current?.commands.setContent(pendingDraft.contentHtml)
    setContentText(editorRef.current?.getText() ?? '')
    setPendingDraft(null)
  }

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setPendingDraft(null)
  }

  const saveDraft = () => {
    if (isEditMode) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraft()))
    showToast('임시 저장했어요.')
  }

  const failValidation = (field: FieldName, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
    setShakeField(field)
    const target =
      field === 'category'
        ? categoryFieldRef.current
        : field === 'title'
          ? titleFieldRef.current
          : contentFieldRef.current
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleImageUploaded = useCallback((file: CommunityPostFile) => {
    setPostFiles((current) =>
      current.some((item) => item.storedFilename === file.storedFilename)
        ? current
        : [...current, file],
    )
  }, [])

  const submit = async () => {
    if (isSubmitting) return

    const nextErrors: Partial<Record<FieldName, string>> = {}
    if (!category) nextErrors.category = '게시판을 선택해주세요.'
    if (title.trim().length < 1) nextErrors.title = '제목을 입력해주세요.'
    if (contentText.trim().length < CONTENT_MIN)
      nextErrors.content = `내용을 ${CONTENT_MIN}자 이상 작성해주세요.`

    setErrors(nextErrors)
    const firstError = (['category', 'title', 'content'] as FieldName[]).find(
      (field) => nextErrors[field],
    )
    if (firstError) {
      failValidation(firstError, nextErrors[firstError] ?? '')
      return
    }

    setSubmitting(true)
    try {
      const retainedFiles = postFiles.filter(
        (file) =>
          file.usageType === 'ATTACHMENT' ||
          contentHtml.includes(file.storedFilename),
      )
      const uploadedAttachments = await uploadPostFiles(files, 'ATTACHMENT')
      const requestFiles = [...retainedFiles, ...uploadedAttachments].filter(
        (file, index, all) =>
          all.findIndex(
            (candidate) => candidate.storedFilename === file.storedFilename,
          ) === index,
      )

      if (uploadedAttachments.length > 0) {
        setPostFiles(requestFiles)
        setFiles([])
      }

      const draft: CommunityPostDraft = {
        category,
        title: title.trim(),
        contentHtml,
        tags,
        visibility,
        files: requestFiles,
        allowComments,
        notify: allowComments && notify,
      }
      let targetPostId: string
      if (isEditMode && postId) {
        await updatePost(postId, draft)
        targetPostId = postId
      } else {
        targetPostId = await createPost(draft)
        localStorage.removeItem(DRAFT_KEY)
      }
      showToast(isEditMode ? '게시글을 수정했어요.' : '게시글을 등록했어요.')
      setTimeout(() => navigate(`/community/posts/${targetPostId}`), 700)
    } catch (error) {
      setSubmitting(false)
      showToast(toErrorMessage(error))
    }
  }

  const placeholderKey = category ?? 'default'

  if (isEditMode && editLoadState !== 'ready') {
    return (
      <EditPostLoadState
        state={editLoadState}
        postId={postId}
      />
    )
  }

  return (
    <PageLayout contentClassName="page-content-zoom-90 max-w-dashboard px-4 sm:px-8">
      <PageTransition>
        <nav aria-label="현재 위치" className="pt-6 text-caption text-ink-500">
          <Link
            to="/community"
            onClick={(event) => {
              event.preventDefault()
              guard.guardNavigation(() => navigate('/community'))
            }}
            className="transition-colors hover:text-navy-800"
          >
            커뮤니티
          </Link>
          <span aria-hidden="true" className="mx-1.5">
            &gt;
          </span>
          <span className="text-ink-700">
            {isEditMode ? '게시글 수정' : '글쓰기'}
          </span>
        </nav>

        <div className="py-6">
          <h1 className="text-[32px] font-bold text-navy-900">
            {isEditMode ? '게시글 수정' : '게시글 작성'}
          </h1>
          <p className="mt-2 text-body-2 text-ink-500">
            {isEditMode
              ? '작성한 내용을 확인하고 필요한 부분을 수정해보세요.'
              : '면접 경험과 유용한 정보를 공유해보세요.'}
          </p>

          {/* 이어쓰기 배너 */}
          <AnimatePresence initial={false}>
            {!isEditMode && pendingDraft ? (
              <motion.div
                variants={collapseSection}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                className="overflow-hidden"
              >
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-ait-m border border-line bg-surface-default px-5 py-4">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-ait-pill bg-surface-muted"
                  >
                    <PenLine className="size-4 text-navy-800" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-2 font-medium text-ink-900">
                      작성 중인 글이 있어요. 이어서 쓸까요?
                    </p>
                    <p className="mt-0.5 text-caption text-ink-500">
                      {formatRelativeTime(pendingDraft.savedAt)} 저장됨
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resumeDraft}
                      className="rounded-ait-s bg-navy-900 px-4 py-2 text-caption font-semibold text-surface-default transition-[filter] duration-150 hover:brightness-[.92]"
                    >
                      이어쓰기
                    </button>
                    <button
                      type="button"
                      onClick={discardDraft}
                      className="rounded-ait-s border border-line bg-surface-default px-4 py-2 text-caption font-medium text-ink-700 transition-colors hover:bg-surface-muted"
                    >
                      새로 쓰기
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <div className="rounded-ait-m border border-line bg-surface-default">
              {/* 게시판 */}
              <FormSection
                ref={categoryFieldRef}
                label="게시판"
                labelId="write-board"
                error={errors.category}
                isShaking={shakeField === 'category'}
                onShakeEnd={() => setShakeField(null)}
              >
                <Dropdown
                  options={CATEGORY_OPTIONS}
                  value={category}
                  onChange={(value) => {
                    setCategory(value)
                    setErrors((prev) => ({ ...prev, category: undefined }))
                  }}
                  ariaLabel="게시판 선택"
                  placeholder="게시판을 선택해주세요."
                  className="w-full max-w-72"
                  invalid={Boolean(errors.category)}
                />
              </FormSection>

              {/* 제목 */}
              <FormSection
                ref={titleFieldRef}
                label="제목"
                labelId="write-title"
                error={errors.title}
                isShaking={shakeField === 'title'}
                onShakeEnd={() => setShakeField(null)}
              >
                <div className="relative">
                  <input
                    id="write-title"
                    type="text"
                    value={title}
                    maxLength={TITLE_MAX}
                    onChange={(event) => {
                      setTitle(event.target.value.slice(0, TITLE_MAX))
                      setErrors((prev) => ({ ...prev, title: undefined }))
                    }}
                    placeholder={`제목을 입력해주세요. (최대 ${TITLE_MAX}자)`}
                    className={cn(
                      'w-full rounded-ait-s border bg-surface-default px-4 py-3 pr-20 text-body-2 text-ink-900 outline-none transition-[border-color] duration-[180ms] placeholder:text-ink-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15',
                      errors.title ? 'border-danger' : 'border-line',
                    )}
                  />
                  <span
                    className={cn(
                      'pointer-events-none absolute bottom-3 right-4 text-caption tabular-nums',
                      title.length > TITLE_WARN ? 'text-danger' : 'text-ink-400',
                    )}
                  >
                    {title.length} / {TITLE_MAX}
                  </span>
                </div>
              </FormSection>

              {/* 내용 */}
              <FormSection
                ref={contentFieldRef}
                label="내용"
                labelId="write-content"
                error={errors.content}
                isShaking={shakeField === 'content'}
                onShakeEnd={() => setShakeField(null)}
              >
                <RichTextEditor
                  placeholderKey={placeholderKey}
                  placeholderLines={CONTENT_PLACEHOLDERS[placeholderKey]}
                  initialContent={isEditMode ? contentHtml : undefined}
                  invalid={Boolean(errors.content)}
                  onReady={(editor) => {
                    editorRef.current = editor
                  }}
                  onUpdate={({ html, text }) => {
                    setContentHtml(html)
                    setContentText(text)
                    setErrors((prev) => ({ ...prev, content: undefined }))
                  }}
                  onImageUploaded={handleImageUploaded}
                />
              </FormSection>

              {/* 파일 첨부 */}
              <FormSection label="파일 첨부" labelId="write-files">
                <FileDropzone
                  files={files}
                  onChange={setFiles}
                  uploadedFiles={postFiles.filter(
                    (file) => file.usageType === 'ATTACHMENT',
                  )}
                  onRemoveUploaded={(target) =>
                    setPostFiles((current) =>
                      current.filter(
                        (file) => file.storedFilename !== target.storedFilename,
                      ),
                    )
                  }
                  disabled={isSubmitting}
                />
              </FormSection>

              {/* 태그 */}
              <FormSection label="태그" labelId="write-tags">
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  suggestions={COMMUNITY_TAG_SUGGESTIONS}
                />
              </FormSection>

              {/* 게시 설정 */}
              <FormSection label="게시 설정" labelId="write-settings">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span id="write-visibility" className="text-body-2 text-ink-700">
                      공개 범위
                    </span>
                    <SegmentedControl
                      options={[
                        { value: 'public', label: '전체 공개' },
                        { value: 'members', label: '멤버만' },
                      ]}
                      value={visibility}
                      onChange={setVisibility}
                      ariaLabel="공개 범위"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span id="write-allow-comments" className="text-body-2 text-ink-700">
                      댓글 허용
                    </span>
                    <Toggle
                      checked={allowComments}
                      onChange={setAllowComments}
                      aria-labelledby="write-allow-comments"
                    />
                  </div>

                  <div
                    className={cn(
                      'flex items-start justify-between gap-3 transition-opacity',
                      !allowComments && 'opacity-45',
                    )}
                  >
                    <div>
                      <span id="write-notify" className="text-body-2 text-ink-700">
                        알림 받기
                      </span>
                      <p className="mt-0.5 text-caption text-ink-400">
                        댓글과 공감 알림을 받습니다.
                      </p>
                    </div>
                    <Toggle
                      checked={notify}
                      onChange={setNotify}
                      disabled={!allowComments}
                      aria-labelledby="write-notify"
                    />
                  </div>
                </div>
              </FormSection>
            </div>

            {/* 하단 액션 */}
            <div className="flex items-center justify-end gap-3 py-5">
              <button
                type="button"
                onClick={() => {
                  if (isEditMode && postId) {
                    guard.guardNavigation(() =>
                      navigate(`/community/posts/${postId}`),
                    )
                    return
                  }
                  saveDraft()
                }}
                className="rounded-ait-s border border-line bg-surface-default px-5 py-2.5 text-body-2 font-medium text-ink-700 transition-colors hover:bg-surface-muted"
              >
                {isEditMode ? '수정 취소' : '임시 저장'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-w-28 items-center justify-center gap-2 rounded-ait-s bg-navy-900 px-5 py-2.5 text-body-2 font-semibold text-surface-default transition-[filter] duration-150 hover:brightness-[.92] disabled:brightness-90"
              >
                {isSubmitting ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  isEditMode ? '수정 완료' : '게시글 등록'
                )}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>

      <ConfirmDialog
        open={guard.isConfirmOpen}
        onOpenChange={guard.setConfirmOpen}
        title={isEditMode ? '수정 중인 내용이 사라집니다.' : '작성 중인 내용이 사라집니다.'}
        description="지금 나가면 저장하지 않은 내용은 복구할 수 없어요."
        confirmLabel="나가기"
        cancelLabel={isEditMode ? '계속 수정' : '계속 작성'}
        onConfirm={guard.runPendingAction}
      />
      <ToastStack toasts={toasts} />
    </PageLayout>
  )
}

interface FormSectionProps {
  label: string
  labelId: string
  error?: string
  isShaking?: boolean
  onShakeEnd?: () => void
  children: React.ReactNode
  ref?: React.Ref<HTMLDivElement>
}

// 작성 폼의 한 섹션. 라벨·에러 메시지·유효성 실패 흔들림을 공통 처리한다.
function FormSection({
  label,
  labelId,
  error,
  isShaking = false,
  onShakeEnd,
  children,
  ref,
}: FormSectionProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'border-b border-line-soft px-8 py-6 last:border-b-0',
        isShaking && 'field-shake',
      )}
      onAnimationEnd={onShakeEnd}
    >
      <p id={labelId} className="mb-3 text-body-2 font-semibold text-ink-900">
        {label}
      </p>
      {children}
      <AnimatePresence>
        {error ? (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.18 } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.14 } }}
            className="overflow-hidden pt-1.5 text-caption text-danger"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

interface EditPostLoadStateProps {
  state: Exclude<EditLoadState, 'ready'>
  postId?: string
}

// 수정할 글을 불러오는 동안의 로딩과 접근 실패 상태를 안내한다.
function EditPostLoadState({ state, postId }: EditPostLoadStateProps) {
  const isLoading = state === 'loading'
  const isForbidden = state === 'forbidden'

  return (
    <PageLayout contentClassName="page-content-zoom-90 max-w-dashboard px-4 sm:px-8">
      <PageTransition>
        <nav aria-label="현재 위치" className="pt-6 text-caption text-ink-500">
          <Link to="/community" className="transition-colors hover:text-navy-800">
            커뮤니티
          </Link>
          <span aria-hidden="true" className="mx-1.5">
            &gt;
          </span>
          <span className="text-ink-700">게시글 수정</span>
        </nav>

        {isLoading ? (
          <div className="py-6">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="mt-3 h-5 w-72" />
            <div className="mt-6 rounded-ait-m border border-line bg-surface-default p-8">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="mt-4 h-11 w-full" />
              <Skeleton className="mt-8 h-5 w-20" />
              <Skeleton className="mt-4 h-72 w-full" />
            </div>
          </div>
        ) : (
          <div className="my-16 rounded-ait-m border border-line bg-surface-default px-6 py-20 text-center">
            <p className="text-body-1 font-semibold text-ink-900">
              {isForbidden
                ? '이 게시글을 수정할 수 없어요.'
                : '수정할 게시글을 찾을 수 없어요.'}
            </p>
            <p className="mt-2 text-body-2 text-ink-500">
              {isForbidden
                ? '게시글을 작성한 사용자만 내용을 수정할 수 있습니다.'
                : '삭제됐거나 주소가 잘못됐을 수 있어요.'}
            </p>
            <Link
              to={isForbidden && postId ? `/community/posts/${postId}` : '/community'}
              className="mt-6 inline-flex rounded-ait-s bg-navy-900 px-5 py-2.5 text-body-2 font-semibold text-surface-default transition-[filter] hover:brightness-[.92]"
            >
              {isForbidden ? '게시글로 돌아가기' : '목록으로 돌아가기'}
            </Link>
          </div>
        )}
      </PageTransition>
    </PageLayout>
  )
}

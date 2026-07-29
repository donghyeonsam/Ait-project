import { Pin, RefreshCw, Send } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  getMyActiveStudyGroups,
  type MyStudyGroup,
} from '@/api/study-groups'
import { toErrorMessage } from '@/api/http'
import { cn } from '@/lib/utils'
import type { StudyChatMessage } from '@/mocks/study-lounge'

interface StudyChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface StudyChatModalGroup {
  id: number
  title: string
  notice: string
  messages: StudyChatMessage[]
}

const dockInfluenceDistance = 112
const dockMaximumScale = 1.42
const dockMaximumLift = 10

function getGroupInitial(title: string) {
  return Array.from(title.trim())[0] ?? '스'
}

// 가입 중인 그룹을 서버에서 불러와 그룹 선택, 공지 확인과 메시지 UI를 제공하는 Dialog다.
export function StudyChatModal({ open, onOpenChange }: StudyChatModalProps) {
  const [groups, setGroups] = useState<StudyChatModalGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [groupLoadError, setGroupLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const messageListRef = useRef<HTMLDivElement>(null)
  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null
  const messageCount = selectedGroup?.messages.length ?? 0

  const applyLoadedGroups = useCallback((studies: MyStudyGroup[]) => {
    setGroups((currentGroups) =>
      studies.map((study) => {
        const currentGroup = currentGroups.find(
          (group) => group.id === study.id,
        )
        return {
          id: study.id,
          title: study.title,
          notice: currentGroup?.notice ?? '',
          messages: currentGroup?.messages ?? [],
        }
      }),
    )
    setSelectedGroupId((currentGroupId) =>
      studies.some((study) => study.id === currentGroupId)
        ? currentGroupId
        : (studies[0]?.id ?? null),
    )
    setGroupLoadError(null)
  }, [])

  useEffect(() => {
    if (!open) return
    void getMyActiveStudyGroups()
      .then(applyLoadedGroups)
      .catch((error: unknown) => {
        setGroupLoadError(toErrorMessage(error))
      })
      .finally(() => {
        setIsLoadingGroups(false)
      })
  }, [applyLoadedGroups, open])

  const loadMyGroups = async () => {
    try {
      applyLoadedGroups(await getMyActiveStudyGroups())
    } catch (error) {
      setGroupLoadError(toErrorMessage(error))
    } finally {
      setIsLoadingGroups(false)
    }
  }

  useEffect(() => {
    if (!open) return
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messageCount, open, selectedGroupId])

  const sendMessage = () => {
    const content = draft.trim()
    if (!content || selectedGroupId === null) return

    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === selectedGroupId
          ? {
              ...group,
              messages: [
                ...group.messages,
                {
                  id: Date.now(),
                  sender: '나',
                  content,
                  isSelf: true,
                },
              ],
            }
          : group,
      ),
    )
    setDraft('')
  }

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const resetDockMagnification = (dock: HTMLElement) => {
    dock
      .querySelectorAll<HTMLElement>('[data-study-chat-dock-item]')
      .forEach((item) => {
        item.style.removeProperty('--study-chat-dock-scale')
        item.style.removeProperty('--study-chat-dock-lift')
      })
  }

  const updateDockMagnification = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const dock = event.currentTarget
    const dockRect = dock.getBoundingClientRect()

    dock
      .querySelectorAll<HTMLElement>('[data-study-chat-dock-item]')
      .forEach((item) => {
        const itemCenter =
          dockRect.left +
          item.offsetLeft -
          dock.scrollLeft +
          item.offsetWidth / 2
        const proximity = Math.max(
          0,
          1 - Math.abs(event.clientX - itemCenter) / dockInfluenceDistance,
        )
        const easedProximity =
          proximity * proximity * (3 - 2 * proximity)
        const scale =
          1 + (dockMaximumScale - 1) * easedProximity
        const lift = -dockMaximumLift * easedProximity

        item.style.setProperty(
          '--study-chat-dock-scale',
          scale.toFixed(3),
        )
        item.style.setProperty(
          '--study-chat-dock-lift',
          `${lift.toFixed(2)}px`,
        )
      })
  }

  const retryLoadMyGroups = () => {
    setIsLoadingGroups(true)
    setGroupLoadError(null)
    void loadMyGroups()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        centered={false}
        className="study-chat-dialog flex flex-col overflow-hidden border border-border-default bg-background-default p-4 sm:p-5"
      >
        <DialogHeader className="shrink-0 text-center">
          <DialogTitle>그룹톡</DialogTitle>
          <DialogDescription className="sr-only">
            참여 중인 스터디 그룹의 공지와 메시지를 확인하고 대화합니다.
          </DialogDescription>
        </DialogHeader>

        {isLoadingGroups && groups.length === 0 ? (
          <div
            className="flex min-h-64 flex-1 items-center justify-center text-body-2 text-text-secondary"
            role="status"
          >
            가입한 스터디를 불러오는 중입니다.
          </div>
        ) : groupLoadError && groups.length === 0 ? (
          <div
            className="flex min-h-64 flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
            role="alert"
          >
            <p className="text-body-2 text-status-error">{groupLoadError}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={retryLoadMyGroups}
            >
              <RefreshCw aria-hidden="true" />
              다시 시도
            </Button>
          </div>
        ) : groups.length === 0 || !selectedGroup ? (
          <div className="flex min-h-64 flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-body-1 font-semibold text-text-primary">
              참여 중인 스터디가 없습니다.
            </p>
            <p className="mt-2 text-caption text-text-secondary">
              스터디 가입이 승인되면 이곳에 그룹 이름이 표시됩니다.
            </p>
          </div>
        ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
          {groupLoadError ? (
            <div
              className="flex items-center justify-between gap-3 rounded-ait-s bg-status-error-surface px-3 py-2"
              role="alert"
            >
              <p className="text-caption text-status-error">
                가입 스터디를 새로 불러오지 못했습니다.
              </p>
              <Button
                type="button"
                variant="text"
                className="h-8 shrink-0 gap-1 py-0 text-caption"
                onClick={retryLoadMyGroups}
              >
                <RefreshCw aria-hidden="true" />
                다시 시도
              </Button>
            </div>
          ) : null}
          <div
            className="study-chat-dock hide-scrollbar relative flex min-h-28 shrink-0 items-center gap-14 overflow-x-auto overflow-y-hidden px-8 py-5"
            role="tablist"
            aria-label="스터디 그룹 선택"
            onPointerMove={updateDockMagnification}
            onPointerLeave={(event) =>
              resetDockMagnification(event.currentTarget)
            }
            onPointerCancel={(event) =>
              resetDockMagnification(event.currentTarget)
            }
          >
            {groups.map((group) => {
              const isSelected = group.id === selectedGroupId
              return (
                <button
                  key={group.id}
                  id={`study-chat-tab-${group.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls="study-chat-panel"
                  aria-label={group.title}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={cn(
                    'study-chat-dock-item relative isolate flex size-12 shrink-0 items-center justify-center rounded-ait-pill border bg-profile-avatar text-body-1 font-semibold text-action-primary',
                    isSelected
                      ? 'study-chat-dock-item-selected border-status-success'
                      : 'border-transparent hover:border-border-default',
                  )}
                  data-study-chat-dock-item
                >
                  <span aria-hidden="true">{getGroupInitial(group.title)}</span>
                  <span
                    className={cn(
                      'absolute left-1/2 top-[calc(100%+0.65rem)] w-28 -translate-x-1/2 truncate text-center text-caption font-medium',
                      isSelected
                        ? 'text-action-primary'
                        : 'text-text-secondary',
                    )}
                    title={group.title}
                    aria-hidden="true"
                  >
                    {group.title}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            id="study-chat-panel"
            role="tabpanel"
            aria-labelledby={`study-chat-tab-${selectedGroupId}`}
            className="flex min-h-0 flex-col rounded-ait-m bg-surface-default p-3 sm:p-4"
          >
            <div className="flex shrink-0 items-center gap-2 rounded-ait-s border border-status-achievement-border bg-status-achievement-surface px-3 py-3 text-body-2 text-action-primary">
              <Pin className="size-4 shrink-0" aria-hidden="true" />
              <p className="truncate">
                <span className="font-semibold">공지 · </span>
                {selectedGroup.notice || '등록된 공지가 없습니다.'}
              </p>
            </div>

            <div
              ref={messageListRef}
              className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-2 py-6"
              aria-live="polite"
              aria-label={`${selectedGroup.title} 그룹 메시지`}
            >
              {selectedGroup.messages.length === 0 ? (
                <p className="py-10 text-center text-caption text-text-secondary">
                  아직 메시지가 없습니다.
                </p>
              ) : selectedGroup.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'study-chat-message flex items-end gap-3',
                    message.isSelf && 'justify-end',
                  )}
                >
                  {!message.isSelf ? (
                    <span
                      className="size-10 shrink-0 rounded-ait-pill bg-profile-avatar"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div
                    className={cn(
                      'max-w-[82%]',
                      message.isSelf && 'text-right',
                    )}
                  >
                    {!message.isSelf ? (
                      <p className="mb-1 text-body-2 text-text-secondary">
                        {message.sender}
                      </p>
                    ) : null}
                    <div
                      className={cn(
                        'relative rounded-ait-l px-4 py-3 text-left text-body-1',
                        message.isSelf
                          ? 'rounded-br-none bg-action-primary text-surface-default'
                          : 'rounded-bl-none bg-status-neutral-surface text-action-primary',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    {message.reactions && message.reactions.length > 0 ? (
                      <div
                        className={cn(
                          'mt-1 flex flex-wrap gap-1',
                          message.isSelf ? 'justify-end' : 'justify-start',
                        )}
                      >
                        {message.reactions.map((reaction) => (
                          <span
                            key={reaction.emoji}
                            className="inline-flex min-h-6 items-center rounded-ait-pill border border-border-default bg-surface-default px-2 text-caption shadow-elevation-1"
                            aria-label={`${reaction.emoji} 반응 ${reaction.users.length}개`}
                          >
                            {reaction.emoji}
                            <span className="ml-1 text-[10px] text-text-secondary">
                              {reaction.users.length}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 items-end gap-3">
              <label className="min-w-0 flex-1">
                <span className="sr-only">메시지 입력</span>
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  rows={1}
                  placeholder="메시지 입력"
                  className="min-h-12 resize-none py-3"
                />
              </label>
              <button
                type="button"
                onClick={sendMessage}
                disabled={!draft.trim()}
                className="flex size-12 shrink-0 items-center justify-center rounded-ait-s bg-action-primary text-surface-default transition-shadow hover:shadow-elevation-2 disabled:bg-status-neutral-surface disabled:text-text-secondary"
                aria-label="메시지 전송"
              >
                <Send className="size-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

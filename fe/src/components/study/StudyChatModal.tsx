import { Pin, Send } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  mockStudyChatGroups,
  type StudyChatGroup,
} from '@/mocks/study-lounge'

interface StudyChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 그룹 선택, 공지 확인과 목 메시지 송신 흐름을 제공하는 그룹톡 Dialog다.
export function StudyChatModal({ open, onOpenChange }: StudyChatModalProps) {
  const [groups, setGroups] = useState<StudyChatGroup[]>(() =>
    mockStudyChatGroups.map((group) => ({
      ...group,
      messages: group.messages.map((message) => ({ ...message })),
    })),
  )
  const [selectedGroupId, setSelectedGroupId] =
    useState<StudyChatGroup['id']>('A')
  const [draft, setDraft] = useState('')
  const messageListRef = useRef<HTMLDivElement>(null)
  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0]
  const messageCount = selectedGroup.messages.length

  useEffect(() => {
    if (!open) return
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messageCount, open, selectedGroupId])

  const sendMessage = () => {
    const content = draft.trim()
    if (!content) return

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

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
          <div
            className="flex shrink-0 gap-2 overflow-x-auto rounded-ait-m bg-surface-default p-2"
            role="tablist"
            aria-label="스터디 그룹 선택"
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
                  onClick={() => setSelectedGroupId(group.id)}
                  className={cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-ait-pill border bg-profile-avatar text-body-1 font-semibold text-action-primary transition-[border-color,box-shadow]',
                    isSelected
                      ? 'border-status-success shadow-elevation-1'
                      : 'border-transparent hover:border-border-default',
                  )}
                >
                  {group.id}
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
                {selectedGroup.notice}
              </p>
            </div>

            <div
              ref={messageListRef}
              className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-2 py-6"
              aria-live="polite"
              aria-label={`${selectedGroupId} 그룹 메시지`}
            >
              {selectedGroup.messages.map((message) => (
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
      </DialogContent>
    </Dialog>
  )
}

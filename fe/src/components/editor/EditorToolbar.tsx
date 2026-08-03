import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { EmojiPopover } from '@/components/editor/EmojiPopover'
import { EmoticonPopover } from '@/components/editor/EmoticonPopover'
import { LinkPopover } from '@/components/editor/LinkPopover'
import { Dropdown } from '@/components/ui/dropdown'
import { cn } from '@/lib/utils'

type HeadingValue = 'paragraph' | 'h1' | 'h2' | 'h3'
type FontValue = 'Pretendard' | 'NanumGothic' | 'Malgun Gothic'
type FontSizeValue =
  | '12px'
  | '14px'
  | '16px'
  | '18px'
  | '20px'
  | '24px'
  | '28px'
  | '32px'

const HEADING_OPTIONS: { value: HeadingValue; label: string }[] = [
  { value: 'paragraph', label: '본문' },
  { value: 'h1', label: '제목1' },
  { value: 'h2', label: '제목2' },
  { value: 'h3', label: '제목3' },
]

const FONT_OPTIONS: { value: FontValue; label: string }[] = [
  { value: 'Pretendard', label: 'Pretendard' },
  { value: 'NanumGothic', label: '나눔고딕' },
  { value: 'Malgun Gothic', label: '맑은 고딕' },
]

const FONT_SIZE_OPTIONS: { value: FontSizeValue; label: string }[] = [
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
]

interface EditorToolbarProps {
  editor: Editor
  onPickImage: () => void
}

// 에디터 상단 툴바. 커서 위치의 마크에 따라 활성 상태를 표시한다.
export function EditorToolbar({ editor, onPickImage }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      heading: (instance.isActive('heading', { level: 1 })
        ? 'h1'
        : instance.isActive('heading', { level: 2 })
          ? 'h2'
          : instance.isActive('heading', { level: 3 })
            ? 'h3'
            : 'paragraph') as HeadingValue,
      font: (FONT_OPTIONS.find((option) =>
        instance.isActive('textStyle', { fontFamily: option.value }),
      )?.value ?? 'Pretendard') as FontValue,
      fontSize: (FONT_SIZE_OPTIONS.find((option) =>
        instance.isActive('textStyle', { fontSize: option.value }),
      )?.value ?? '14px') as FontSizeValue,
      bold: instance.isActive('bold'),
      italic: instance.isActive('italic'),
      underline: instance.isActive('underline'),
      bulletList: instance.isActive('bulletList'),
      orderedList: instance.isActive('orderedList'),
      blockquote: instance.isActive('blockquote'),
      link: instance.isActive('link'),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  })

  const setHeading = (value: HeadingValue) => {
    const chain = editor.chain().focus()
    if (value === 'paragraph') chain.setParagraph().run()
    else chain.toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run()
  }

  const setFont = (value: FontValue) => {
    editor.chain().focus().setFontFamily(value).run()
  }

  const setFontSize = (value: FontSizeValue) => {
    editor.chain().focus().setFontSize(value).run()
  }

  return (
    <div
      role="toolbar"
      aria-label="서식 도구"
      className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5"
    >
      <Dropdown
        options={HEADING_OPTIONS}
        value={state?.heading ?? 'paragraph'}
        onChange={setHeading}
        ariaLabel="문단 스타일"
        className="w-24 shrink-0"
        buttonClassName="border-0 px-2.5 py-1.5 hover:bg-surface-muted"
      />
      <Dropdown
        options={FONT_OPTIONS}
        value={state?.font ?? 'Pretendard'}
        onChange={setFont}
        ariaLabel="글꼴"
        className="w-32 shrink-0"
        buttonClassName="border-0 px-2.5 py-1.5 hover:bg-surface-muted"
      />
      <Dropdown
        options={FONT_SIZE_OPTIONS}
        value={state?.fontSize ?? '14px'}
        onChange={setFontSize}
        ariaLabel="글자 크기"
        className="w-20 shrink-0"
        buttonClassName="border-0 px-2.5 py-1.5 hover:bg-surface-muted"
      />

      <Divider />

      <ToolbarButton
        label="굵게"
        shortcut="Ctrl+B"
        isActive={state?.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold aria-hidden="true" className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="기울임"
        shortcut="Ctrl+I"
        isActive={state?.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic aria-hidden="true" className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="밑줄"
        shortcut="Ctrl+U"
        isActive={state?.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline aria-hidden="true" className="size-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="불릿 리스트"
        isActive={state?.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List aria-hidden="true" className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="번호 리스트"
        isActive={state?.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered aria-hidden="true" className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="인용"
        isActive={state?.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote aria-hidden="true" className="size-4" />
      </ToolbarButton>

      <Divider />

      <LinkPopover editor={editor} isActive={state?.link ?? false} />
      <ToolbarButton label="이미지" onClick={onPickImage}>
        <ImagePlus aria-hidden="true" className="size-4" />
      </ToolbarButton>
      <EmojiPopover editor={editor} />
      <EmoticonPopover editor={editor} />

      <Divider />

      <ToolbarButton
        label="되돌리기"
        shortcut="Ctrl+Z"
        disabled={!state?.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 aria-hidden="true" className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="다시 실행"
        shortcut="Ctrl+Shift+Z"
        disabled={!state?.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 aria-hidden="true" className="size-4" />
      </ToolbarButton>
    </div>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-line" />
}

interface ToolbarButtonProps {
  label: string
  shortcut?: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

// 툴바 아이콘 버튼. hover 200ms 지연 후 단축키를 포함한 툴팁을 보여준다.
function ToolbarButton({
  label,
  shortcut,
  isActive = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <span className="group relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={isActive}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-ait-s transition-colors duration-[120ms]',
          isActive
            ? 'bg-surface-muted text-navy-800'
            : 'text-ink-500 hover:bg-surface-muted hover:text-ink-700',
          disabled && 'cursor-not-allowed text-ink-400 opacity-50 hover:bg-transparent',
        )}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-[calc(100%+0.375rem)] z-[var(--z-index-dropdown)] -translate-x-1/2 whitespace-nowrap rounded-ait-s bg-ink-900 px-2 py-1 text-[11px] text-surface-default opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:delay-200"
      >
        {label}
        {shortcut ? <span className="ml-1.5 text-ink-400">{shortcut}</span> : null}
      </span>
    </span>
  )
}

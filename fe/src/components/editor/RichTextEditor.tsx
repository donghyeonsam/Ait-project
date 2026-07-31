import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { CharacterCount } from '@tiptap/extensions'
import type { Editor } from '@tiptap/react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { uploadPostFile } from '@/api/community'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { ResizableImage } from '@/components/editor/ResizableImage'
import { cn } from '@/lib/utils'
import type { CommunityPostFile } from '@/types/community'

interface RichTextEditorProps {
  placeholderLines: string[]
  // 게시판 선택에 따라 placeholder가 크로스페이드로 교체될 때 쓰는 키.
  placeholderKey: string
  initialContent?: string
  invalid?: boolean
  onReady?: (editor: Editor) => void
  onUpdate?: (payload: { html: string; text: string }) => void
  onImageUploaded?: (file: CommunityPostFile) => void
}

// Tiptap 기반 리치 텍스트 에디터. 툴바·이미지 업로드(선택/붙여넣기/드래그)·글자수를 담당한다.
export function RichTextEditor({
  placeholderLines,
  placeholderKey,
  initialContent = '',
  invalid = false,
  onReady,
  onUpdate,
  onImageUploaded,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // editorProps 핸들러는 에디터 생성 시점에 고정되므로 최신 업로드 함수를 ref로 참조한다.
  const uploadImageRef = useRef<(file: File) => void>(() => {})

  const editor = useEditor({
    content: initialContent,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      TextStyle,
      FontFamily,
      FontSize,
      ResizableImage,
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class: 'community-prose min-h-[300px] px-4 py-4 focus:outline-none',
        'aria-label': '내용',
      },
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
          item.type.startsWith('image/'),
        )
        if (!file) return false
        uploadImageRef.current(file)
        return true
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false
        const file = Array.from(event.dataTransfer?.files ?? []).find((item) =>
          item.type.startsWith('image/'),
        )
        if (!file) return false
        event.preventDefault()
        uploadImageRef.current(file)
        return true
      },
    },
    onUpdate: ({ editor: instance }) => {
      onUpdate?.({ html: instance.getHTML(), text: instance.getText() })
    },
  })

  useEffect(() => {
    if (editor) onReady?.(editor)
  }, [editor, onReady])

  const editorState = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      isEmpty: instance.isEmpty,
      characters: instance.storage.characterCount.characters(),
    }),
  })

  useEffect(() => {
    uploadImageRef.current = async (file: File) => {
      if (!editor || uploadProgress !== null) return
      setUploadProgress(0)
      setUploadError(null)

      try {
        const uploadedFile = await uploadPostFile(file, 'INLINE')
        setUploadProgress(100)
        editor
          .chain()
          .focus()
          .setImage({ src: uploadedFile.url, alt: file.name })
          .run()
        onImageUploaded?.(uploadedFile)
      } catch {
        setUploadError(
          '이미지를 업로드하지 못했어요. 파일을 확인하고 다시 시도해주세요.',
        )
      } finally {
        setUploadProgress(null)
      }
    }
  }, [editor, onImageUploaded, uploadProgress])

  return (
    <div
      className={cn(
        'rounded-ait-s border bg-surface-default transition-[border-color] duration-[180ms] focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15',
        invalid ? 'border-danger' : 'border-line',
      )}
    >
      {editor ? <EditorToolbar editor={editor} onPickImage={() => fileInputRef.current?.click()} /> : null}

      {uploadProgress !== null ? (
        <div
          role="progressbar"
          aria-valuenow={uploadProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="이미지 업로드 중"
          className="h-0.5 w-full bg-line-soft"
        >
          <div
            className="h-full bg-brand-blue transition-[width] duration-150"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      ) : null}
      {uploadError ? (
        <p role="alert" className="px-4 py-2 text-caption text-danger">
          {uploadError}
        </p>
      ) : null}

      <div className="relative">
        <EditorContent editor={editor} />

        {/* 게시판별 placeholder — 내용이 비어 있을 때만 보이고, 게시판 변경 시 크로스페이드된다. */}
        <AnimatePresence mode="wait">
          {editorState?.isEmpty ? (
            <motion.div
              key={placeholderKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2 } }}
              exit={{ opacity: 0, transition: { duration: 0.14 } }}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-4 text-body-2 leading-relaxed text-ink-400"
            >
              {placeholderLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <span className="pointer-events-none absolute bottom-2 right-3 text-caption text-ink-400 tabular-nums">
          {editorState?.characters ?? 0}자
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        aria-label="이미지 파일 선택"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) uploadImageRef.current(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { Paperclip, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { formatFileSize } from '@/lib/format'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf']

interface FileDropzoneProps {
  files: File[]
  onChange: (files: File[]) => void
}

// 드래그앤드롭·클릭으로 파일을 첨부하는 드롭존. 용량·개수·확장자를 검증한다.
export function FileDropzone({ files, onChange }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragDepth = useRef(0)

  const addFiles = (incoming: FileList | File[]) => {
    const next = [...files]
    let nextError: string | null = null

    for (const file of Array.from(incoming)) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        nextError = 'png, jpg, jpeg, pdf 파일만 첨부할 수 있어요.'
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        nextError = '파일 하나당 10MB까지 첨부할 수 있어요.'
        continue
      }
      if (next.some((item) => item.name === file.name && item.size === file.size)) {
        continue
      }
      if (next.length >= MAX_FILES) {
        nextError = '파일은 최대 5개까지 첨부할 수 있어요.'
        break
      }
      next.push(file)
    }

    setError(nextError)
    onChange(next)
  }

  const removeFile = (target: File) => {
    setError(null)
    onChange(files.filter((file) => file !== target))
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setDragOver(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => {
          dragDepth.current -= 1
          if (dragDepth.current <= 0) setDragOver(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          dragDepth.current = 0
          setDragOver(false)
          addFiles(event.dataTransfer.files)
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-ait-s border border-dashed px-6 py-8 transition-[border-color,background-color,transform] duration-150',
          isDragOver
            ? 'scale-[1.01] border-brand-blue bg-brand-blue/[0.04]'
            : 'border-line bg-surface-muted/60 hover:border-ink-400',
        )}
      >
        <Paperclip aria-hidden="true" className="size-5 text-ink-400" />
        <span className="text-body-2 text-ink-500">
          여기에 파일을 끌어다 놓거나 클릭해서 선택하세요.
        </span>
        <span className="text-caption text-ink-400">
          png · jpg · jpeg · pdf, 개당 10MB, 최대 5개
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.pdf"
        className="hidden"
        aria-label="파일 첨부"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files)
          event.target.value = ''
        }}
      />

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

      {files.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {files.map((file) => (
              <motion.li
                key={`${file.name}-${file.size}`}
                layout="position"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  transition: { type: 'spring', stiffness: 500, damping: 30 },
                }}
                exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.12 } }}
                className="inline-flex items-center gap-2 rounded-ait-pill border border-line bg-surface-default px-3 py-1.5 text-caption text-ink-700"
              >
                <Paperclip aria-hidden="true" className="size-3.5 text-ink-400" />
                <span className="max-w-52 truncate">{file.name}</span>
                <span className="text-ink-400">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  aria-label={`${file.name} 첨부 삭제`}
                  className="rounded-ait-pill p-0.5 text-ink-400 hover:bg-surface-muted hover:text-ink-700"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}
    </div>
  )
}

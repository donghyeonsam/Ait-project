import {
  Download,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Presentation,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatFileSize, formatPostDate } from '@/lib/format'
import type { StudyMaterialFile } from '@/types/study-materials'

// 확장자별 아이콘과 색상. 상태 색이 아니라 파일 종류 식별용이므로 텍스트 토큰 계열만 함께 쓴다.
const FILE_ICON_MAP: Record<string, { icon: LucideIcon; className: string }> = {
  pdf: { icon: FileText, className: 'text-status-error' },
  doc: { icon: FileText, className: 'text-status-info' },
  docx: { icon: FileText, className: 'text-status-info' },
  md: { icon: FileText, className: 'text-text-secondary' },
  xls: { icon: FileSpreadsheet, className: 'text-status-success' },
  xlsx: { icon: FileSpreadsheet, className: 'text-status-success' },
  csv: { icon: FileSpreadsheet, className: 'text-status-success' },
  ppt: { icon: Presentation, className: 'text-status-warning' },
  pptx: { icon: Presentation, className: 'text-status-warning' },
  zip: { icon: FileArchive, className: 'text-text-secondary' },
}

function toExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? filename.slice(dotIndex + 1).toLowerCase() : ''
}

interface StudyMaterialFileListProps {
  files: StudyMaterialFile[]
  onDownload: (file: StudyMaterialFile) => void
}

// 공유된 파일을 드라이브형 목록으로 보여주는 자료실 파일 탭. 좁은 화면에서는 보조 열을 숨긴다.
export function StudyMaterialFileList({
  files,
  onDownload,
}: StudyMaterialFileListProps) {
  if (files.length === 0) {
    return (
      <div className="rounded-ait-m border border-border-default bg-surface-default py-16 text-center">
        <p className="text-body-1 text-text-primary">아직 공유된 파일이 없어요</p>
        <p className="mt-2 text-body-2 text-text-secondary">
          그룹톡에서 파일을 공유하면 이곳에 모아볼 수 있어요.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-ait-m border border-border-default bg-surface-default">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-border-default">
            <th scope="col" className="px-4 py-3 text-caption font-semibold text-text-secondary">
              이름
            </th>
            <th scope="col" className="hidden w-28 px-4 py-3 text-caption font-semibold text-text-secondary md:table-cell">
              올린 사람
            </th>
            <th scope="col" className="hidden w-32 px-4 py-3 text-caption font-semibold text-text-secondary sm:table-cell">
              올린 날짜
            </th>
            <th scope="col" className="hidden w-24 px-4 py-3 text-caption font-semibold text-text-secondary sm:table-cell">
              크기
            </th>
            <th scope="col" className="w-16 px-4 py-3">
              <span className="sr-only">다운로드</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const { icon: Icon, className } =
              FILE_ICON_MAP[toExtension(file.originalFilename)] ?? {
                icon: File,
                className: 'text-text-secondary',
              }
            return (
              <tr
                key={file.id}
                className="border-b border-border-default transition-colors [transition-duration:var(--duration-fast)] last:border-b-0 hover:bg-status-neutral-surface"
              >
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon
                      className={`size-5 shrink-0 ${className}`}
                      aria-hidden="true"
                    />
                    <span className="truncate text-body-2 text-text-primary">
                      {file.originalFilename}
                    </span>
                  </div>
                  {/* 좁은 화면에서 숨긴 열의 정보를 이름 아래 한 줄로 요약한다. */}
                  <p className="mt-1 pl-7 text-caption text-text-secondary sm:hidden">
                    {file.uploaderNickname} · {formatPostDate(file.createdAt)} ·{' '}
                    {formatFileSize(file.sizeBytes)}
                  </p>
                </td>
                <td className="hidden truncate px-4 py-3 text-body-2 text-text-secondary md:table-cell">
                  {file.uploaderNickname}
                </td>
                <td className="hidden px-4 py-3 text-body-2 text-text-secondary sm:table-cell">
                  {formatPostDate(file.createdAt)}
                </td>
                <td className="hidden px-4 py-3 text-body-2 text-text-secondary sm:table-cell">
                  {formatFileSize(file.sizeBytes)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDownload(file)}
                    className="inline-flex size-10 items-center justify-center rounded-ait-s text-text-secondary transition-colors [transition-duration:var(--duration-fast)] hover:bg-surface-default hover:text-action-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-action-primary/25"
                    aria-label={`${file.originalFilename} 다운로드`}
                  >
                    <Download aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

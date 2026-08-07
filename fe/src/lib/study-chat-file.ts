// 그룹톡 첨부 파일의 표시용 변환 모음. 서버 files 스키마가 정식 경로이고,
// 과거 메시지에 남아 있는 파일 토큰 문자열은 하위 호환으로 계속 파싱한다.
import type {
  StudyGroupChatFile,
  StudyGroupChatFileType,
} from '@/api/study-group-chat'
import { getUploadedFileUrl } from '@/api/http'

export interface StudyChatFileAttachment {
  storedFilename: string
  originalFilename: string
  url: string
  isImage: boolean
  fileSize?: number | null
}

// 서버 FileType enum과 같은 분류를 확장자로 추론한다. 업로드 시 서버에 함께 보낸다.
const fileTypeByExtension: Record<string, StudyGroupChatFileType> = {
  png: 'IMAGE',
  jpg: 'IMAGE',
  jpeg: 'IMAGE',
  gif: 'IMAGE',
  webp: 'IMAGE',
  bmp: 'IMAGE',
  avif: 'IMAGE',
  svg: 'IMAGE',
  pdf: 'PDF',
  doc: 'DOCUMENT',
  docx: 'DOCUMENT',
  xls: 'DOCUMENT',
  xlsx: 'DOCUMENT',
  ppt: 'DOCUMENT',
  pptx: 'DOCUMENT',
  txt: 'DOCUMENT',
  md: 'DOCUMENT',
  csv: 'DOCUMENT',
  hwp: 'DOCUMENT',
  zip: 'ZIP',
  '7z': 'ZIP',
  rar: 'ZIP',
  tar: 'ZIP',
  gz: 'ZIP',
}

export function toStudyGroupFileType(
  filename: string,
): StudyGroupChatFileType {
  const dotIndex = filename.lastIndexOf('.')
  const extension =
    dotIndex > 0 ? filename.slice(dotIndex + 1).toLowerCase() : ''
  return fileTypeByExtension[extension] ?? 'OTHER'
}

// 업로드한 브라우저 File과 저장 파일명으로 전송용 파일 정보를 만든다.
export function toStudyGroupChatFile(
  storedFilename: string,
  file: File,
): StudyGroupChatFile {
  return {
    originalFilename: file.name,
    storedFilename,
    fileType: toStudyGroupFileType(file.name),
    fileSize: file.size,
  }
}

// 서버 files 스키마의 첨부를 화면 표시용 형태로 바꾼다.
export function fromStudyGroupChatFile(
  file: StudyGroupChatFile,
): StudyChatFileAttachment {
  return {
    storedFilename: file.storedFilename,
    originalFilename: file.originalFilename,
    url: getUploadedFileUrl(file.storedFilename),
    isImage: file.fileType === 'IMAGE',
    fileSize: file.fileSize,
  }
}

// 채팅 메시지 DB 컬럼이 255자라 인코딩된 파일명이 길면 확장자를 남기고 앞부분만 유지한다.
const maxEncodedNameLength = 120

function clipOriginalFilename(name: string) {
  if (encodeURIComponent(name).length <= maxEncodedNameLength) return name

  const dotIndex = name.lastIndexOf('.')
  const extension = dotIndex > 0 ? name.slice(dotIndex) : ''
  // 이모지 같은 서로게이트 쌍이 중간에서 잘리지 않도록 코드 포인트 단위로 줄인다.
  const baseChars = Array.from(dotIndex > 0 ? name.slice(0, dotIndex) : name)
  while (
    baseChars.length > 1 &&
    encodeURIComponent(`${baseChars.join('')}…${extension}`).length >
      maxEncodedNameLength
  ) {
    baseChars.pop()
  }
  return `${baseChars.join('')}…${extension}`
}

// encodeURIComponent 결과에는 ':'와 ']'가 없어 토큰 구분자와 충돌하지 않는다.
export function toFileToken(storedFilename: string, originalFilename: string) {
  return `[file:${encodeURIComponent(storedFilename)}:${encodeURIComponent(clipOriginalFilename(originalFilename))}]`
}

const fileTokenPattern = /^\[file:([^:\]]+):([^:\]]*)\]$/
const imageExtensionPattern = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i

// 문자열 전체가 파일 토큰일 때만 첨부 정보를 돌려주고, 아니면 null을 반환한다.
export function parseFileToken(value: string): StudyChatFileAttachment | null {
  const match = fileTokenPattern.exec(value.trim())
  if (!match) return null

  try {
    const storedFilename = decodeURIComponent(match[1])
    const originalFilename = decodeURIComponent(match[2]) || storedFilename
    return {
      storedFilename,
      originalFilename,
      url: getUploadedFileUrl(storedFilename),
      isImage: imageExtensionPattern.test(storedFilename),
    }
  } catch {
    // 손상된 토큰은 첨부로 취급하지 않고 원문 그대로 보여준다.
    return null
  }
}

// 서버 채팅 스키마 변경 없이 첨부 파일을 표현하기 위해 업로드 결과를 토큰 문자열로 보내고 화면에서 되돌린다.
import { getUploadedFileUrl } from '@/api/http'

export interface StudyChatFileAttachment {
  storedFilename: string
  originalFilename: string
  url: string
  isImage: boolean
}

// encodeURIComponent 결과에는 ':'와 ']'가 없어 토큰 구분자와 충돌하지 않는다.
export function toFileToken(storedFilename: string, originalFilename: string) {
  return `[file:${encodeURIComponent(storedFilename)}:${encodeURIComponent(originalFilename)}]`
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

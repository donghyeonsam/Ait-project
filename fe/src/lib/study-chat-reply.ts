// 서버 채팅 스키마 변경 없이 답글을 표현하기 위해 메시지 문자열 맨 앞에 답글 토큰을 넣고 화면에서 되돌린다.
import { parseEmoticonToken } from '@/lib/emoticons'
import { parseFileToken } from '@/lib/study-chat-file'

export interface StudyChatReplyTarget {
  chatId: number
  nickname: string
  preview: string
}

const replyPreviewMaxLength = 40

// encodeURIComponent 결과에는 ':'와 ']'가 없어 토큰 구분자와 충돌하지 않는다.
const replyTokenPattern = /^\[reply:(\d+):([^:\]]*):([^:\]]*)\]\n?/

export function toReplyToken(target: StudyChatReplyTarget) {
  return `[reply:${target.chatId}:${encodeURIComponent(target.nickname)}:${encodeURIComponent(target.preview)}]`
}

// 원본 메시지가 이후 이력 잘림으로 화면에 없어도 인용을 보여줄 수 있게 닉네임·미리보기를 토큰에 함께 담는다.
export function toReplyTarget(message: {
  chatId: number
  senderNickname: string
  message: string
}): StudyChatReplyTarget {
  return {
    chatId: message.chatId,
    nickname: message.senderNickname,
    preview: toStudyChatPreviewText(message.message),
  }
}

export function parseReplyMessage(raw: string): {
  reply: StudyChatReplyTarget | null
  body: string
} {
  const match = replyTokenPattern.exec(raw)
  if (!match) return { reply: null, body: raw }

  try {
    return {
      reply: {
        chatId: Number(match[1]),
        nickname: decodeURIComponent(match[2]),
        preview: decodeURIComponent(match[3]),
      },
      body: raw.slice(match[0].length),
    }
  } catch {
    // 손상된 토큰은 답글로 취급하지 않고 원문 그대로 보여준다.
    return { reply: null, body: raw }
  }
}

// 그룹 전환 목록·답글 인용처럼 한 줄 미리보기가 필요한 곳에서 토큰을 사람이 읽을 문구로 바꾼다.
export function toStudyChatPreviewText(raw: string) {
  const { body } = parseReplyMessage(raw)
  const emoticon = parseEmoticonToken(body)
  if (emoticon) return `${emoticon.label} 이모티콘`

  const file = parseFileToken(body)
  const previewSource = file ? `파일: ${file.originalFilename}` : body
  const singleLine = previewSource.replaceAll('\n', ' ').trim()
  return singleLine.length > replyPreviewMaxLength
    ? `${singleLine.slice(0, replyPreviewMaxLength)}…`
    : singleLine
}

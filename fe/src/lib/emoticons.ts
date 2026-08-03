// Ait 캐릭터 이모티콘 목록과 채팅 메시지 토큰 변환을 담당한다.

export interface AitEmoticon {
  id: string
  label: string
  src: string
}

// public/Ait_character_emoticon 폴더의 파일명(번호_이름)과 1:1로 대응한다.
const emoticonIds = [
  '01_인사',
  '02_웃음',
  '03_울음',
  '04_화남',
  '05_놀람',
  '06_부끄러움',
  '07_생각중',
  '08_좋아요',
  '09_사랑',
  '10_축하',
  '11_졸림',
  '12_의지',
  '13_긴장',
  '14_슬픔',
  '15_궁금함',
  '16_정중한인사',
]

export const aitEmoticons: AitEmoticon[] = emoticonIds.map((id) => ({
  id,
  label: id.slice(3),
  src: `/Ait_character_emoticon/${id}.png`,
}))

// 채팅은 문자열만 주고받으므로 이모티콘을 토큰 문자열로 보내고 화면에서 이미지로 되돌린다.
export function toEmoticonChatMessage(emoticon: AitEmoticon) {
  return `[emoticon:${emoticon.id}]`
}

const emoticonMessagePattern = /^\[emoticon:([^\]]+)\]$/

// 메시지 전체가 이모티콘 토큰일 때만 해당 이모티콘을 돌려주고, 아니면 null을 반환한다.
export function parseEmoticonChatMessage(message: string): AitEmoticon | null {
  const match = emoticonMessagePattern.exec(message.trim())
  if (!match) return null
  return aitEmoticons.find((emoticon) => emoticon.id === match[1]) ?? null
}

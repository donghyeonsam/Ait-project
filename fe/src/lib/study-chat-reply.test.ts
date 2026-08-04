import { describe, expect, it } from 'vitest'
import {
  parseReplyMessage,
  toReplyTarget,
  toReplyToken,
  toStudyChatPreviewText,
} from '@/lib/study-chat-reply'

describe('study-chat-reply', () => {
  it('답글 토큰을 만들고 다시 원본 정보와 본문으로 되돌린다', () => {
    const target = { chatId: 12, nickname: '김구미', preview: '오늘 회의는 3시' }
    const raw = `${toReplyToken(target)}\n네 알겠습니다!`

    expect(parseReplyMessage(raw)).toEqual({
      reply: target,
      body: '네 알겠습니다!',
    })
  })

  it('구분자가 들어간 닉네임·미리보기도 안전하게 오간다', () => {
    const target = { chatId: 3, nickname: '철:수]짱', preview: '[reply:1:a:b]' }
    const raw = `${toReplyToken(target)}\n답변`

    expect(parseReplyMessage(raw).reply).toEqual(target)
  })

  it('답글 토큰이 없거나 깨진 메시지는 원문 그대로 돌려준다', () => {
    expect(parseReplyMessage('그냥 메시지')).toEqual({
      reply: null,
      body: '그냥 메시지',
    })
    expect(parseReplyMessage('[reply:abc:x:y]본문').reply).toBeNull()
  })

  it('답글 대상 미리보기는 토큰을 벗기고 길면 줄여 만든다', () => {
    const longMessage = '가'.repeat(60)
    const target = toReplyTarget({
      chatId: 5,
      senderNickname: '김아이',
      message: `${toReplyToken({ chatId: 1, nickname: 'a', preview: 'b' })}\n${longMessage}`,
    })

    expect(target.nickname).toBe('김아이')
    expect(target.preview).toBe(`${'가'.repeat(40)}…`)
  })

  it('이모티콘 메시지 미리보기는 이모티콘 이름으로 바꾼다', () => {
    expect(toStudyChatPreviewText('[emoticon:02_웃음]')).toBe('웃음 이모티콘')
  })
})

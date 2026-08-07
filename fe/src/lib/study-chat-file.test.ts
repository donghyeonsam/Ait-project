import { describe, expect, it } from 'vitest'
import { parseFileToken, toFileToken } from '@/lib/study-chat-file'
import { toStudyChatPreviewText } from '@/lib/study-chat-reply'

describe('study-chat-file', () => {
  it('파일 토큰을 만들고 다시 첨부 정보로 되돌린다', () => {
    const token = toFileToken('chats/uuid-1234.pdf', '발표자료.pdf')

    expect(parseFileToken(token)).toMatchObject({
      storedFilename: 'chats/uuid-1234.pdf',
      originalFilename: '발표자료.pdf',
      isImage: false,
    })
  })

  it('구분자가 들어간 파일명도 안전하게 오간다', () => {
    const token = toFileToken('chats/a.png', '회의:정리]최종.png')

    expect(parseFileToken(token)?.originalFilename).toBe('회의:정리]최종.png')
  })

  it('이미지 확장자는 이미지 첨부로 구분한다', () => {
    const token = toFileToken('chats/photo.PNG', '사진.PNG')

    expect(parseFileToken(token)?.isImage).toBe(true)
  })

  it('파일 토큰이 아니거나 깨진 문자열은 첨부로 취급하지 않는다', () => {
    expect(parseFileToken('그냥 메시지')).toBeNull()
    expect(parseFileToken('[file:%zz:name]')).toBeNull()
    expect(parseFileToken('[file:a.png:b.png] 추가 텍스트')).toBeNull()
  })

  it('긴 파일명은 확장자를 남기고 잘라 메시지 길이 제한을 넘지 않게 한다', () => {
    const longName = `${'가'.repeat(60)}.pdf`
    const token = toFileToken('chats/uuid.pdf', longName)

    expect(token.length).toBeLessThanOrEqual(200)
    const parsed = parseFileToken(token)
    expect(parsed?.originalFilename.endsWith('….pdf')).toBe(true)
  })

  it('파일 메시지 미리보기는 파일 이름으로 바꾼다', () => {
    const token = toFileToken('chats/uuid.pdf', '발표자료.pdf')

    expect(toStudyChatPreviewText(token)).toBe('파일: 발표자료.pdf')
  })
})

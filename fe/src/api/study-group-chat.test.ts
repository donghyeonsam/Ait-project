import { describe, expect, it } from 'vitest'
import {
  applyStudyGroupChatReactionUpdate,
  setStudyGroupChatReactionForUser,
} from '@/api/study-group-chat'

describe('applyStudyGroupChatReactionUpdate', () => {
  it('교차 도착한 전체 목록에 덮어쓰지 않고 여러 이모지 변경분을 유지한다', () => {
    const firstReaction = setStudyGroupChatReactionForUser(
      [],
      '🎉',
      7,
      true,
    )
    const secondReaction = setStudyGroupChatReactionForUser(
      firstReaction,
      '👏',
      7,
      true,
    )

    expect(secondReaction).toEqual([
      { emoji: '🎉', count: 1, userIds: [7] },
      { emoji: '👏', count: 1, userIds: [7] },
    ])
  })

  it('특정 사용자가 해제한 반응만 제거한다', () => {
    const reactions = setStudyGroupChatReactionForUser(
      [{ emoji: '👍', count: 2, userIds: [7, 8] }],
      '👍',
      7,
      false,
    )

    expect(reactions).toEqual([{ emoji: '👍', count: 1, userIds: [8] }])
  })

  it('구형 서버의 교차 응답에도 현재 사용자가 선택한 여러 반응을 보존한다', () => {
    const optimisticReactions = [
      { emoji: '🎉', count: 1, userIds: [7] },
      { emoji: '👏', count: 1, userIds: [7] },
    ]
    const firstServerResponse = applyStudyGroupChatReactionUpdate(
      optimisticReactions,
      {
        groupId: 3,
        chatId: 21,
        reactions: [{ emoji: '🎉', count: 1, userIds: [7] }],
      },
      7,
    )
    const lateServerResponse = applyStudyGroupChatReactionUpdate(
      firstServerResponse,
      {
        groupId: 3,
        chatId: 21,
        reactions: [{ emoji: '👏', count: 1, userIds: [7] }],
      },
      7,
    )

    expect(lateServerResponse).toEqual(optimisticReactions)
  })
})

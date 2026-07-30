import { describe, expect, it } from 'vitest'
import {
  createPost,
  deletePost,
  fetchPost,
  fetchPosts,
  updatePost,
} from '@/api/community'
import type { CommunityPostDraft } from '@/types/community'

const draft: CommunityPostDraft = {
  category: 'tip',
  title: 'CRUD 테스트 게시글',
  contentHtml: '<p>게시글 수정과 삭제 동작을 확인합니다.</p>',
  tags: ['테스트'],
  visibility: 'public',
  allowComments: true,
  notify: true,
}

describe('community mock CRUD', () => {
  it('로그인 사용자의 게시글을 생성·수정·조회·삭제한다', async () => {
    const created = await createPost(draft, '테스트사용자')

    const updated = await updatePost(
      created.id,
      {
        ...draft,
        title: '수정된 CRUD 테스트 게시글',
        contentHtml: '<p>수정된 게시글 내용입니다.</p>',
      },
      '테스트사용자',
    )

    expect(updated.title).toBe('수정된 CRUD 테스트 게시글')
    await expect(fetchPost(created.id)).resolves.toMatchObject({
      title: '수정된 CRUD 테스트 게시글',
      author: '테스트사용자',
    })

    const mine = await fetchPosts({
      tab: 'mine',
      category: 'all',
      sort: null,
      offset: 0,
      limit: 20,
      currentUserNickname: '테스트사용자',
    })
    expect(mine.items.map((post) => post.id)).toContain(created.id)

    await deletePost(created.id, '테스트사용자')
    await expect(fetchPost(created.id)).resolves.toBeNull()
  })

  it('작성자가 아닌 사용자의 수정과 삭제를 거부한다', async () => {
    await expect(
      updatePost('post-2', draft, '김싸피'),
    ).rejects.toThrow('수정할 권한이 없습니다.')
    await expect(
      deletePost('post-2', '김싸피'),
    ).rejects.toThrow('삭제할 권한이 없습니다.')
  })
})

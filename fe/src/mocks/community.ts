import type { CommunityPost } from '@/types/community'

// 커뮤니티 화면 확인용 목업 데이터. 스크린샷의 실제 콘텐츠를 우선 반영한다.
// TODO: 실제 API 연동 필요

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const now = Date.now()

const ago = (ms: number) => new Date(now - ms).toISOString()

// 상세 스크린샷의 게시글 본문. Tiptap이 생성하는 형태의 HTML로 맞춘다.
const tipPostContent = `
<p>면접에서 모르는 질문을 받으면 당황해서 바로 ‘잘 모르겠습니다.’라고 끝내는 경우가 많습니다.</p>
<ol>
  <li>
    <p><strong>모르는 부분은 솔직하게 인정하기</strong><br>모르는 내용을 억지로 아는 척하면 신뢰를 잃을 수 있습니다.<br>먼저 솔직하게 모른다고 인정하는 것이 좋습니다.</p>
  </li>
  <li>
    <p><strong>알고 있는 범위까지 설명하기</strong><br>완전히 모르더라도 관련된 개념이나 이전 경험 중 연결되는 부분을 찾아 설명해보세요.<br>지원자의 지식 폭과 응용력을 보여줄 수 있습니다.</p>
  </li>
  <li>
    <p><strong>생각하는 과정을 보여주기</strong><br>정답을 아는 것보다 문제를 해결해가는 사고 과정이 더 중요합니다.<br>어떻게 접근하고 고민할지 논리적으로 말해보세요.</p>
  </li>
</ol>
`.trim()

const genericContent = (title: string) => `
<p>${title}</p>
<p>면접을 준비하며 정리한 내용을 공유합니다. 비슷한 상황을 준비하는 분들께 도움이 되면 좋겠습니다.</p>
<ul>
  <li><p>사전에 기업과 직무를 조사하고 예상 질문을 정리했습니다.</p></li>
  <li><p>답변은 결론 → 근거 → 경험 순서로 구성했습니다.</p></li>
  <li><p>면접이 끝난 뒤 복기를 남겨 다음 면접에 반영했습니다.</p></li>
</ul>
`.trim()

// 스크린샷 3건 + 더보기 검증용 12건.
export const mockPosts: CommunityPost[] = [
  {
    id: 'post-1',
    category: 'review',
    title: '카카오 프론트엔드 1차 면접 후기 공유합니다.',
    excerpt: '기습 질문보다 프로젝트에서 왜 그렇게 결정했는지를 깊게 물어봤어요.',
    contentHtml: genericContent(
      '기습 질문보다 프로젝트에서 왜 그렇게 결정했는지를 깊게 물어봤어요.',
    ),
    author: '김싸피',
    createdAt: ago(5 * HOUR),
    tags: ['프론트엔드', '카카오'],
    viewCount: 2100,
    commentCount: 987,
    likeCount: 138,
    liked: false,
    bookmarked: false,
  },
  {
    id: 'post-2',
    category: 'qna',
    title: 'CS 질문에서 모르는 내용이 나왔을 때 어떻게 답변하시나요?',
    excerpt: '솔직하게 모른다고 말하는게 나을지, 아는 범위까지 설명하는 게 좋을지 고민입니다.',
    contentHtml: genericContent(
      '솔직하게 모른다고 말하는게 나을지, 아는 범위까지 설명하는 게 좋을지 고민입니다.',
    ),
    author: '이준호',
    createdAt: ago(9 * HOUR),
    tags: ['기술면접', 'CS'],
    viewCount: 1800,
    commentCount: 483,
    likeCount: 97,
    liked: false,
    bookmarked: false,
  },
  {
    id: 'post-3',
    category: 'tip',
    title: '면접에서 모르는 질문이 나왔을 때 이렇게 답변해보세요',
    excerpt:
      '면접에서 모르는 질문을 받으면 당황해서 바로 “잘 모르겠습니다”라고 끝내는 경우가 많은데요. 완벽한 정답보다 사고 과정이 중요합니다.',
    contentHtml: tipPostContent,
    author: '김싸피',
    createdAt: new Date('2026-07-28T10:00:00+09:00').toISOString(),
    tags: ['면접팁', '기술면접', '직무면접'],
    viewCount: 3912,
    commentCount: 842,
    likeCount: 954,
    liked: false,
    bookmarked: false,
  },
  ...Array.from({ length: 12 }, (_, index): CommunityPost => {
    const categories = ['review', 'qna', 'tip', 'study'] as const
    const category = categories[index % categories.length]
    const titles: Record<(typeof categories)[number], string> = {
      review: `네이버 백엔드 ${index + 1}차 면접 후기입니다.`,
      qna: `자기소개는 어느 정도 길이가 적당할까요? (${index + 1})`,
      tip: `면접 전날 컨디션 관리 루틴 공유 (${index + 1})`,
      study: `모의면접 스터디 팀원 ${index + 1}명 모집합니다.`,
    }
    const excerpts: Record<(typeof categories)[number], string> = {
      review: '꼬리 질문이 많아서 기본기를 확실히 잡고 가는 걸 추천드려요.',
      qna: '1분 자기소개가 길어지면 지루해질까 봐 걱정입니다.',
      tip: '긴장을 줄이는 데 도움이 됐던 방법들을 정리했습니다.',
      study: '주 2회 화상으로 모의면접을 진행하고 서로 피드백합니다.',
    }
    const tags: Record<(typeof categories)[number], string[]> = {
      review: ['백엔드', '네이버'],
      qna: ['자기소개', '인성면접'],
      tip: ['취업준비', '컨디션관리'],
      study: ['스터디모집', '모의면접'],
    }
    return {
      id: `post-${index + 4}`,
      category,
      title: titles[category],
      excerpt: excerpts[category],
      contentHtml: genericContent(excerpts[category]),
      author: ['박현지', '이호창', '조윤재', '한서연'][index % 4],
      createdAt: ago((index + 1) * DAY),
      tags: tags[category],
      viewCount: 1500 - index * 90,
      commentCount: 120 - index * 7,
      likeCount: 220 - index * 15,
      liked: false,
      bookmarked: false,
    }
  }),
]

import type { NotificationItem } from '@/types/notification'

// 알림 드롭다운 확인용 목업 데이터.
// TODO: 실제 API 연동 필요

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const now = Date.now()

const ago = (ms: number) => new Date(now - ms).toISOString()

export const mockNotifications: NotificationItem[] = [
  {
    id: 'noti-1',
    category: 'group',
    title: '프론트엔드 스터디 그룹 가입이 승인됐어요.',
    description: '이제 그룹 게시판과 일정을 확인할 수 있어요.',
    createdAt: ago(20 * 60 * 1000),
    read: false,
  },
  {
    id: 'noti-2',
    category: 'board',
    title: '내 게시글에 새 댓글이 달렸어요.',
    description: '"카카오 프론트엔드 1차 면접 후기 공유합니다."',
    createdAt: ago(1 * HOUR),
    read: false,
  },
  {
    id: 'noti-3',
    category: 'group',
    title: '백엔드 스터디 그룹장이 다음 세션 일정을 등록했어요.',
    description: '8월 3일 오후 8시, 모의면접 세션',
    createdAt: ago(3 * HOUR),
    read: false,
  },
  {
    id: 'noti-4',
    category: 'board',
    title: '내가 쓴 댓글에 답글이 달렸어요.',
    description: '"저도 같은 질문 받았어요, 참고하시라고 남겨요."',
    createdAt: ago(5 * HOUR),
    read: true,
  },
  {
    id: 'noti-5',
    category: 'group',
    title: '알고리즘 스터디 그룹에 참여 신청이 도착했어요.',
    description: '그룹장 권한으로 신청을 확인할 수 있어요.',
    createdAt: ago(DAY),
    read: true,
  },
  {
    id: 'noti-6',
    category: 'board',
    title: '작성한 게시글이 인기글로 선정됐어요.',
    description: '"신입 개발자가 준비하면 좋은 CS 질문 정리"',
    createdAt: ago(2 * DAY),
    read: true,
  },
]

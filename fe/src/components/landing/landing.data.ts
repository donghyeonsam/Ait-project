import {
  BarChart3,
  BrainCircuit,
  MessagesSquare,
  Mic2,
  ScanFace,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react'

export const LANDING_ASSET_ROOT =
  '/Ait_landing_package/public/assets/landing'

export const landingRoutes = {
  start: '/signup',
  login: '/login',
  interviews: '/interviews',
  study: '/study',
  community: '/community',
  tools: '/mypage/documents/resume',
} as const

export const heroMetrics = [
  { value: 120000, suffix: '+', label: '누적 사용자', icon: UsersRound },
  { value: 2500000, suffix: '+', label: '모의면접 완료', icon: Mic2 },
  { value: 92, suffix: '%', label: '서비스 만족도', icon: TrendingUp },
]

export const trustFields = [
  'IT · 서비스',
  '금융 · 핀테크',
  '제조 · 모빌리티',
  '공공 · 교육',
  '스타트업',
]

export const features = [
  {
    id: 'solo',
    eyebrow: '실전형 질문',
    title: 'AI 1:1 모의면접',
    description:
      '지원 직무에 맞는 질문을 받고, 편안한 환경에서 답변을 반복해 보세요.',
    icon: MessagesSquare,
  },
  {
    id: 'study',
    eyebrow: '함께하는 연습',
    title: '그룹 스터디',
    description:
      '친구들과 모의면접을 진행하고 실시간 피드백을 주고받을 수 있어요.',
    icon: UsersRound,
  },
  {
    id: 'analysis',
    eyebrow: '다각도 관찰',
    title: '멀티모달 분석',
    description:
      '시선, 표정, 음성, 답변 속도를 함께 살펴 면접 습관을 구체적으로 확인해요.',
    icon: ScanFace,
  },
  {
    id: 'report',
    eyebrow: '성장 데이터',
    title: '맞춤형 리포트',
    description:
      'AI가 관찰한 답변 흐름과 항목별 변화를 한눈에 이해하기 쉽게 정리해요.',
    icon: BarChart3,
  },
] as const

export const demoFeedback = [
  {
    icon: Sparkles,
    title: '구조화',
    description: '핵심 경험을 먼저 제시해 답변 흐름이 명확해요.',
  },
  {
    icon: BrainCircuit,
    title: '구체성',
    description: '성과를 보여주는 수치나 사례를 한 가지 더해보세요.',
  },
  {
    icon: Mic2,
    title: '전달 속도',
    description: '중요한 문장 앞에서 잠시 쉬면 더 편안하게 들릴 수 있어요.',
  },
]

export const growthSteps = [
  {
    number: '01',
    title: '연습하기',
    description: 'AI 모의면접으로 실전처럼 답변 연습을 시작합니다.',
    icon: MessagesSquare,
  },
  {
    number: '02',
    title: '분석받기',
    description: '답변과 비언어적 신호를 항목별 데이터로 확인합니다.',
    icon: BarChart3,
  },
  {
    number: '03',
    title: '개선하기',
    description: '관찰 근거와 제안으로 다음 답변을 더 선명하게 다듬습니다.',
    icon: TrendingUp,
  },
]

export const finalBenefits = [
  '무료 체험 제공',
  '카드 등록 없이 시작',
  '개인정보 안내 확인 가능',
  '언제든 다시 연습',
]

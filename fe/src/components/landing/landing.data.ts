import {
  BarChart3,
  MessagesSquare,
  Mic2,
  ScanFace,
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

export const galleryScreens = [
  {
    id: 'interview',
    label: 'AI 모의면접 세션',
    src: `${LANDING_ASSET_ROOT}/screens/interview.png`,
  },
  {
    id: 'report',
    label: '멀티모달 분석 리포트',
    src: `${LANDING_ASSET_ROOT}/screens/report.png`,
  },
  {
    id: 'study',
    label: '그룹 스터디 룸',
    src: `${LANDING_ASSET_ROOT}/screens/study.png`,
  },
  {
    id: 'dashboard',
    label: '성장 대시보드',
    src: `${LANDING_ASSET_ROOT}/screens/dashboard.png`,
  },
  {
    id: 'documents',
    label: '자소서 · 이력서 관리',
    src: `${LANDING_ASSET_ROOT}/screens/documents.png`,
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

export const showcaseQuestions = [
  {
    id: 'frontend',
    field: '프론트엔드',
    question:
      '렌더링 성능을 개선했던 경험과 개선 효과를 측정한 방법을 말씀해 주세요.',
    tags: ['기술 깊이', '성과 측정'],
  },
  {
    id: 'backend',
    field: '백엔드',
    question:
      '트래픽이 몰리는 API를 어떤 순서로 진단하고 개선할지 설명해 주세요.',
    tags: ['문제 해결', '설계'],
  },
  {
    id: 'data',
    field: '데이터',
    question: '핵심 지표가 급락했을 때 원인을 어떤 순서로 파악하시겠어요?',
    tags: ['분석 사고', '가설 검증'],
  },
  {
    id: 'pm',
    field: '기획',
    question:
      '이해관계자 의견이 충돌할 때 우선순위를 정했던 경험을 들려주세요.',
    tags: ['협업', '의사결정'],
  },
  {
    id: 'design',
    field: '디자인',
    question: '사용성 개선을 위해 데이터를 근거로 설득한 사례가 있나요?',
    tags: ['근거 기반', '사용자 관점'],
  },
  {
    id: 'common',
    field: '공통 역량',
    question: '실패했던 프로젝트에서 무엇을 배우고 어떻게 적용했나요?',
    tags: ['회고', '성장'],
  },
] as const

export const finalBenefits = [
  '무료 체험 제공',
  '카드 등록 없이 시작',
  '개인정보 안내 확인 가능',
  '언제든 다시 연습',
]

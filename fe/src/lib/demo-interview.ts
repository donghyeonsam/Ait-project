import type { GeneratedInterviewQuestion } from '@/api/ai-interviews'

const DEMO_FIRST_QUESTION: GeneratedInterviewQuestion = {
  order: 1,
  question:
    'Python으로 개발한 디스코드 알고리즘 봇 프로젝트를 소개하고, 해당 봇을 만들게 된 배경과 본인이 맡은 역할을 설명해 주세요.',
  rubric: [
    '디스코드 알고리즘 봇을 개발한 배경과 해결하려던 문제를 설명한다',
    'Python으로 구현한 핵심 기능을 구체적으로 설명한다',
    '본인이 맡은 역할과 기여한 부분을 명확하게 설명한다',
  ],
  topic: '디스코드 알고리즘 봇',
  source: 'demo',
  depth: 0,
}

const DEMO_FIRST_FOLLOW_UP: GeneratedInterviewQuestion = {
  order: 1,
  question:
    '디스코드 봇의 명령어 처리와 알고리즘 문제 데이터 연동을 Python으로 어떻게 설계했으며, 개발 중 발생한 기술적 문제를 어떻게 해결했는지 설명해 주세요.',
  // 시연에서는 이 질문을 1번 질문의 마지막 꼬리질문으로 사용한다.
  rubric: [],
  topic: 'Python 봇 설계와 문제 해결',
  source: 'demo',
  depth: 1,
}

const DEMO_SECOND_QUESTION: GeneratedInterviewQuestion = {
  order: 2,
  question:
    'Python 기반 디스코드 알고리즘 봇에서 여러 사용자의 명령이 동시에 들어올 때 안정적으로 처리하기 위해 비동기 로직과 예외 처리를 어떻게 구현했는지 설명해 주세요.',
  rubric: [
    'Python 비동기 처리 방식을 프로젝트 구조와 연결해 설명한다',
    '동시 요청에서 발생할 수 있는 문제와 대응 방법을 설명한다',
    '예외 상황을 처리하고 사용자에게 오류를 안내한 방법을 설명한다',
  ],
  topic: 'Python 비동기 처리와 예외 처리',
  source: 'demo',
  depth: 0,
}

function cloneQuestion(
  question: GeneratedInterviewQuestion,
): GeneratedInterviewQuestion {
  return {
    ...question,
    rubric: [...question.rubric],
  }
}

export function isDemoInterviewAccount(email: string | null | undefined) {
  const configuredEmail = import.meta.env.VITE_DEMO_INTERVIEW_EMAIL
    ?.trim()
    .toLowerCase()

  return Boolean(
    configuredEmail && email?.trim().toLowerCase() === configuredEmail,
  )
}

export function isDemoPortfolioInterview(
  email: string | null | undefined,
  interviewType: string,
) {
  return (
    isDemoInterviewAccount(email) && interviewType.trim() === '포폴 면접'
  )
}

export function replaceDemoQuestions(
  questions: GeneratedInterviewQuestion[],
  enabled: boolean,
) {
  if (!enabled) return questions

  return questions.map((question) => {
    if (question.order === 1) return cloneQuestion(DEMO_FIRST_QUESTION)
    if (question.order === 2) return cloneQuestion(DEMO_SECOND_QUESTION)
    return question
  })
}

export function resolveDemoFollowUpQuestion({
  enabled,
  answeredQuestion,
  generatedFollowUp,
}: {
  enabled: boolean
  answeredQuestion: GeneratedInterviewQuestion
  generatedFollowUp: GeneratedInterviewQuestion | null
}) {
  if (!enabled || answeredQuestion.order !== 1) {
    return generatedFollowUp
  }

  const depth = answeredQuestion.depth ?? 0
  if (depth === 0) {
    return cloneQuestion(DEMO_FIRST_FOLLOW_UP)
  }

  // 고정 꼬리질문에 답한 뒤에는 두 번째 꼬리질문을 노출하지 않는다.
  if (
    depth === DEMO_FIRST_FOLLOW_UP.depth &&
    answeredQuestion.question === DEMO_FIRST_FOLLOW_UP.question
  ) {
    return null
  }

  return generatedFollowUp
}

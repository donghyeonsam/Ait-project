export interface MockInterviewQuestion {
  id: number
  question: string
  rubric: string[]
}

// TODO: 실제 면접 생성 API가 연결되면 이 fixture를 서버 질문과 rubric으로 교체한다.
export const mockInterviewQuestions: MockInterviewQuestion[] = [
  {
    id: 1,
    question: '간단한 자기소개와 이번 면접에서 강조하고 싶은 강점을 말씀해주세요.',
    rubric: ['지원 직무와 연결된 강점', '구체적인 경험 근거'],
  },
  {
    id: 2,
    question: '최근 프로젝트에서 가장 해결하기 어려웠던 문제와 해결 과정을 설명해주세요.',
    rubric: ['문제 상황의 명확한 설명', '본인의 기여와 해결 과정'],
  },
  {
    id: 3,
    question: '협업 중 의견 충돌이 발생했을 때 어떻게 조율했는지 사례를 들어 말씀해주세요.',
    rubric: ['갈등 원인 파악', '구체적인 조율 행동'],
  },
  {
    id: 4,
    question: '지원 직무에서 중요하다고 생각하는 역량과 이를 준비한 방법은 무엇인가요?',
    rubric: ['직무 역량 이해', '준비 과정의 구체성'],
  },
  {
    id: 5,
    question: '입사 후 이루고 싶은 목표와 그 목표를 위한 계획을 말씀해주세요.',
    rubric: ['현실적인 목표', '실행 가능한 계획'],
  },
]

import { backendRequest } from '@/api/http'
import type { InterviewInputContract } from '@/lib/interview-session'
import type {
  CsTopic,
  Difficulty,
  InterviewGoalType,
  InterviewStyle,
} from '@/mocks/interview'

export interface InterviewCoverLetter {
  id: number
  title: string
  companyName: string
  updatedAt: string
}

export interface InterviewGithubRepository {
  id: number
  repoName: string
  repoNickname: string
  updatedAt: string
}

export interface InterviewPreparation {
  userId: number
  coverLetters: InterviewCoverLetter[]
  githubRepositories: InterviewGithubRepository[]
}

export interface GeneratedInterviewQuestion {
  order: number
  question: string
  rubric: string[]
  topic: string | null
  source: string | null
  // 꼬리질문 깊이. 최초 생성 질문에는 없을 수 있어 0으로 취급한다.
  depth?: number | null
}

export interface InterviewQuestionGenerationResponse {
  userId: number
  // 현재 BE의 FastAPI snake_case 역직렬화 문제로 null이 반환될 수 있다.
  aiInterviewId: number | null
  interviewType: string | null
  questions: GeneratedInterviewQuestion[]
  ragUsed: boolean | null
}

interface GenerateInterviewQuestionsOptions {
  input: InterviewInputContract
  signal?: AbortSignal
}

const interviewTypeMap: Record<InterviewGoalType, string> = {
  '직무 면접': 'job',
  'CS 면접': 'cs',
  '기술 면접': 'tech',
  '포폴 면접': 'portfolio',
  종합: 'comprehensive',
}

const difficultyMap: Record<Difficulty, string> = {
  쉬움: 'easy',
  보통: 'normal',
  어려움: 'hard',
}

const interviewStyleMap: Record<InterviewStyle, string> = {
  평화형: 'comfortable',
  밸런스형: 'realistic',
  압박형: 'pressure',
}

const csCategoryMap: Record<CsTopic, string> = {
  '알고리즘 / 자료구조': 'data_structure_algorithm',
  '운영 체제': 'operating_system',
  네트워크: 'network',
  WEB: 'web',
  데이터베이스: 'database',
  보안: 'security',
  '소프트웨어 공학': 'software_engineering',
  AI: 'ai',
  '언어 · 프레임워크': 'language_framework',
}

export function getInterviewPreparation() {
  return backendRequest<InterviewPreparation>('/api/ai-interviews')
}

// 면접 설정을 AI 서버 계약으로 변환해 질문과 채점 기준을 생성한다.
export function generateInterviewQuestions({
  input,
  signal,
}: GenerateInterviewQuestionsOptions) {
  return backendRequest<InterviewQuestionGenerationResponse>(
    '/api/ai-interviews',
    {
      method: 'POST',
      signal,
      body: JSON.stringify({
        jobRole: input.position,
        experienceLevel: input.careerLevel,
        resumeId: input.references.resumeId,
        coverLetterId: input.references.coverLetterId,
        githubRepoId: input.references.repositoryId,
        interviewType: interviewTypeMap[input.interviewType],
        csCategories: input.csCategories.map(
          (category) => csCategoryMap[category],
        ),
        difficulty: difficultyMap[input.difficulty],
        aiAttitudeStyle: interviewStyleMap[input.style],
      }),
    },
  )
}

export interface InterviewAnswerSubmissionResponse {
  isPass: boolean | null
  nextQuestion: GeneratedInterviewQuestion | null
}

interface SubmitInterviewAnswerOptions {
  aiInterviewId: number
  input: InterviewInputContract
  question: GeneratedInterviewQuestion
  answer: string
  audioBlob: Blob
  signal?: AbortSignal
}

// 답변 텍스트와 녹음 파일을 멀티파트로 제출하고, 통과 여부와 꼬리질문을 돌려받는다.
export function submitInterviewAnswer({
  aiInterviewId,
  input,
  question,
  answer,
  audioBlob,
  signal,
}: SubmitInterviewAnswerOptions) {
  const questionRequest = {
    interviewType: interviewTypeMap[input.interviewType],
    resumeId: input.references.resumeId,
    coverLetterId: input.references.coverLetterId,
    githubRepoId: input.references.repositoryId,
    question: {
      order: question.order,
      question: question.question,
      rubric: question.rubric,
      topic: question.topic,
      source: question.source,
      depth: question.depth ?? 0,
    },
    answer,
  }

  const formData = new FormData()
  // @RequestPart로 JSON을 역직렬화할 수 있게 content type을 명시한 Blob으로 담는다.
  formData.append(
    'questionRequest',
    new Blob([JSON.stringify(questionRequest)], { type: 'application/json' }),
  )
  formData.append(
    'audioFile',
    audioBlob,
    audioBlob.type.includes('mp4') ? 'answer.mp4' : 'answer.webm',
  )

  return backendRequest<InterviewAnswerSubmissionResponse>(
    `/api/ai-interviews/${aiInterviewId}/answers`,
    {
      method: 'POST',
      signal,
      body: formData,
    },
  )
}

// 면접 종료를 서버에 알려 리포트 비동기 생성을 시작시킨다.
// 응답은 즉시 오고 리포트는 백그라운드에서 만들어지므로 완료 여부는 결과 조회로 확인한다.
export function completeInterview(aiInterviewId: number) {
  return backendRequest<void>(`/api/ai-interviews/${aiInterviewId}/complete`, {
    method: 'POST',
  })
}

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

// TODO: BE 응답 스펙 확정 시 실제 타입으로 교체 (꼬리질문 정보가 담길 예정, 현재는 placeholder)
export type InterviewAnswerSubmissionResponse = unknown

interface SubmitInterviewAnswerOptions {
  aiInterviewId: number
  question: GeneratedInterviewQuestion
  answer: string
  signal?: AbortSignal
}

// 사용자 답변을 BE에 제출한다. 응답은 스펙 확정 전이라 아직 사용하지 않는다.
export function submitInterviewAnswer({
  aiInterviewId,
  question,
  answer,
  signal,
}: SubmitInterviewAnswerOptions) {
  return backendRequest<InterviewAnswerSubmissionResponse>(
    `/api/ai-interviews/${aiInterviewId}/answers`,
    {
      method: 'POST',
      signal,
      body: JSON.stringify({ question, answer }),
    },
  )
}

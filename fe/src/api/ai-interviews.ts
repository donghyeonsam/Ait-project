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
  depth: number
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
  isPass: boolean
  nextQuestion: GeneratedInterviewQuestion | null
}

interface SubmitInterviewAnswerOptions {
  aiInterviewId: number
  input: InterviewInputContract
  question: GeneratedInterviewQuestion
  answer: string
  audio: Blob
  signal?: AbortSignal
}

function inferAudioFilename(audio: Blob) {
  return audio.type.includes('mp4') ? 'answer.mp4' : 'answer.webm'
}

// 사용자 답변 텍스트와 원본 녹음을 함께 제출해 채점 및 꼬리질문을 받는다.
export function submitInterviewAnswer({
  aiInterviewId,
  input,
  question,
  answer,
  audio,
  signal,
}: SubmitInterviewAnswerOptions) {
  const form = new FormData()
  form.append(
    'questionRequest',
    new Blob(
      [
        JSON.stringify({
          interviewType: interviewTypeMap[input.interviewType],
          resumeId: input.references.resumeId,
          coverLetterId: input.references.coverLetterId,
          githubRepoId: input.references.repositoryId,
          question: {
            ...question,
            depth: question.depth ?? 0,
          },
          answer,
        }),
      ],
      { type: 'application/json' },
    ),
  )
  form.append('audioFile', audio, inferAudioFilename(audio))

  return backendRequest<InterviewAnswerSubmissionResponse>(
    `/api/ai-interviews/${aiInterviewId}/answers`,
    {
      method: 'POST',
      signal,
      body: form,
    },
  )
}

export interface NonVerbalFrame {
  timestamp: number
  gaze_x: number
  gaze_y: number
  blendshapes: number[]
  ear: number
  mar: number
}

export interface InterviewNonVerbalData {
  screen_width: number
  screen_height: number
  fps: number
  duration_sec: number
  frames: NonVerbalFrame[]
}

export function submitInterviewNonVerbalData(
  aiInterviewId: number,
  data: InterviewNonVerbalData,
  signal?: AbortSignal,
) {
  return backendRequest<void>(
    `/api/ai-interviews/${aiInterviewId}/non-verbal`,
    {
      method: 'POST',
      signal,
      body: JSON.stringify(data),
    },
  )
}

import { backendRequest } from '@/api/http'
import type { InterviewInputContract } from '@/lib/interview-session'
import type {
  CsTopic,
  Difficulty,
  InterviewGoalType,
  InterviewStyle,
} from '@/mocks/interview'
import type { InterviewRecord, InterviewType } from '@/types/dashboard'

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

export interface NonVerbalFrame {
  timestamp: number
  gaze_x: number
  gaze_y: number
  blendshapes: number[]
  ear: number
  mar: number
}

interface SendNonVerbalDataOptions {
  aiInterviewId: number
  screenWidth: number
  screenHeight: number
  fps: number
  durationSec: number
  frames: NonVerbalFrame[]
  signal?: AbortSignal
}

// 답변 구간의 표정·시선 원시 프레임을 전송한다. BE가 직접 ai-evaluate를 호출해 표정 점수를
// 계산하고, 시선 이탈은 자체 공식으로 판정해 리포트에 반영한다(비동기라 응답에 데이터가 없다).
export function sendNonVerbalData({
  aiInterviewId,
  screenWidth,
  screenHeight,
  fps,
  durationSec,
  frames,
  signal,
}: SendNonVerbalDataOptions) {
  return backendRequest<void>(
    `/api/ai-interviews/${aiInterviewId}/non-verbal`,
    {
      method: 'POST',
      signal,
      body: JSON.stringify({
        screen_width: screenWidth,
        screen_height: screenHeight,
        fps,
        duration_sec: durationSec,
        frames,
      }),
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

// BE 리포트 목록 항목. 리포트가 생성된 면접만 내려오고 분석 중인 면접은 목록에 없다.
interface ReportListItemResponse {
  aiInterviewId: number
  interviewType: string
  difficulty: string
  aiAttitudeStyle: string
  status: string
  score: number
  createdAt: string
  endedAt: string | null
}

const interviewTypeLabelMap: Record<string, InterviewType> = {
  job: '직무',
  cs: 'CS',
  tech: '기술',
  portfolio: '포폴',
  comprehensive: '종합',
}

const difficultyLabelMap: Record<string, InterviewRecord['difficulty']> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
}

const formatRecordDate = (iso: string) => {
  const date = new Date(iso)
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`
}

const formatRecordDuration = (createdAt: string, endedAt: string | null) => {
  if (!endedAt) return '-'
  const totalSeconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(createdAt).getTime()) / 1000),
  )
  return `${Math.floor(totalSeconds / 60)}분 ${String(totalSeconds % 60).padStart(2, '0')}초`
}

export interface InterviewReportQuestion {
  questionId: number
  question: string
  userAnswer: string
  aiAnswer: string
  feedback: string
}

export interface InterviewReportContent {
  strengths: string[]
  weaknesses: string[]
}

export interface InterviewReportDetail {
  aiInterviewId: number
  interviewType: string
  difficulty: string
  createdAt: string
  content: InterviewReportContent
  // 이하 점수는 10점 만점. 비언어 데이터가 수집되지 않은 면접은 시선·표정이 0으로 내려온다.
  eyeContactScore: number
  faceScore: number
  voiceScore: number
  qnaScore: number
  sentenceScore: number
  questions: InterviewReportQuestion[]
}

// content는 @JsonRawValue로 중첩 객체로 내려오지만, 이중 인코딩된 문자열이 와도 견디도록 정규화한다.
const toReportContent = (content: unknown): InterviewReportContent => {
  let value = content
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      value = null
    }
  }
  const record = (value ?? {}) as Partial<InterviewReportContent>
  return {
    strengths: Array.isArray(record.strengths) ? record.strengths : [],
    weaknesses: Array.isArray(record.weaknesses) ? record.weaknesses : [],
  }
}

// 면접 한 건의 리포트 상세(역량 점수·종합 피드백·질문별 내역)를 조회한다.
export async function getInterviewReportDetail(
  aiInterviewId: number,
): Promise<InterviewReportDetail> {
  const detail = await backendRequest<
    Omit<InterviewReportDetail, 'content'> & { content: unknown }
  >(`/api/ai-interviews/${aiInterviewId}/result`)
  return {
    ...detail,
    content: toReportContent(detail.content),
    questions: detail.questions ?? [],
  }
}

// 리포트 목록을 화면 기록 모델로 바꿔 최신순으로 돌려준다.
// 점수 증감은 응답에 없어 직전 면접과의 점수 차이로 계산한다.
export async function getInterviewReports(): Promise<InterviewRecord[]> {
  const items = await backendRequest<ReportListItemResponse[]>(
    '/api/ai-interviews/result',
  )
  const ascending = [...items].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
  return ascending
    .map((item, index): InterviewRecord => {
      const type = interviewTypeLabelMap[item.interviewType] ?? '종합'
      return {
        id: item.aiInterviewId,
        date: formatRecordDate(item.createdAt),
        type,
        difficulty: difficultyLabelMap[item.difficulty] ?? '보통',
        title: `${type} 면접`,
        score: item.score,
        delta: index > 0 ? item.score - ascending[index - 1].score : 0,
        duration: formatRecordDuration(item.createdAt, item.endedAt),
        status: item.status === 'done' ? 'completed' : 'analyzing',
      }
    })
    .reverse()
}

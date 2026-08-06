import type { InterviewRecord } from '@/types/dashboard'

const DAY_MS = 24 * 60 * 60 * 1000

export interface InterviewActivityStats {
  thisWeek: number
  weekDiff: number
  currentStreak: number
  bestStreak: number
}

// 'YYYY. MM. DD' 형식의 기록 날짜를 Date로 되돌린다.
const parseRecordDate = (date: string) => new Date(date.replace(/\. /g, '-'))

// 대시보드와 AI 면접기록 화면이 같은 수치를 보여주도록, 완료된 면접만 대상으로
// 최근 7일(롤링) 활동과 연속 연습 일수를 한 곳에서 계산한다.
export function computeInterviewActivityStats(
  records: InterviewRecord[],
  now: Date = new Date(),
): InterviewActivityStats {
  const completed = records.filter((record) => record.status !== 'analyzing')

  const dayTimes = [
    ...new Set(
      completed.map((record) => {
        const day = parseRecordDate(record.date)
        day.setHours(0, 0, 0, 0)
        return day.getTime()
      }),
    ),
  ].sort((a, b) => a - b)

  const weekStart = now.getTime() - 7 * DAY_MS
  const previousWeekStart = weekStart - 7 * DAY_MS
  const dates = completed.map((record) => parseRecordDate(record.date).getTime())
  const thisWeek = dates.filter((time) => time >= weekStart).length
  const lastWeek = dates.filter(
    (time) => time >= previousWeekStart && time < weekStart,
  ).length

  let bestStreak = 0
  let run = 0
  let previousDay: number | null = null
  for (const day of dayTimes) {
    run = previousDay !== null && day - previousDay === DAY_MS ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
    previousDay = day
  }

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const lastDay = dayTimes.at(-1)
  // 마지막 연습이 오늘이나 어제면 연속이 이어지는 중으로 본다.
  const currentStreak =
    lastDay !== undefined && today.getTime() - lastDay <= DAY_MS ? run : 0

  return { thisWeek, weekDiff: thisWeek - lastWeek, currentStreak, bestStreak }
}

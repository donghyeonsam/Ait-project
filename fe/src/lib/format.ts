// 숫자·날짜를 커뮤니티 화면 표기 규칙에 맞게 변환한다.

// 1,000 이상은 2.1k 형태로 축약하고, 그 미만은 그대로 보여준다.
export function formatCompactCount(value: number): string {
  if (value < 1000) return String(value)
  const compact = Math.floor((value / 1000) * 10) / 10
  return Number.isInteger(compact) ? `${compact.toFixed(0)}k` : `${compact}k`
}

// 조회 3,912처럼 천 단위 구분 기호를 붙인다.
export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR')
}

// 2026. 07. 28 형태의 작성일 표기.
export function formatPostDate(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}`
}

// 2026. 07. 28 10:04:05 형태로 초까지 포함한 작성 시각 표기.
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${formatPostDate(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// n분 전 / n시간 전 / n일 전 상대 시각 표기. 하루가 넘으면 날짜로 보여준다.
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return formatPostDate(iso)
}

// 파일 용량을 KB/MB 단위로 표기한다.
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

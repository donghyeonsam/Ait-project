// 가입 신청한 그룹 id를 사용자별로 localStorage에 보관한다.
// BE에 내 신청 목록 조회 API가 없어, 새로고침 후에도 신청 완료 표시를 유지하려면 브라우저 저장이 필요하다.

const storageKey = (userId: number) => `ait:applied-study-groups:${userId}`

export function loadAppliedStudyIds(userId: number): Set<number> {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is number => typeof id === 'number'))
  } catch {
    return new Set()
  }
}

export function saveAppliedStudyIds(userId: number, ids: Set<number>) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...ids]))
  } catch {
    // 저장 실패(용량 초과·프라이빗 모드)해도 화면 동작은 계속한다.
  }
}

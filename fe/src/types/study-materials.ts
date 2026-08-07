// 스터디 자료실 도메인 타입. 자료는 서버 파일 모아보기 API와 그룹톡 첨부에서 파생한다.

export type StudyMaterialTab = 'image' | 'file'

// 자료 한 건. 저장 파일명이 서버 생성 유일값이라 소스(전용 API·실시간·과거 토큰)가 달라도 id로 쓴다.
export interface StudyMaterialItem {
  id: string
  storedFilename: string
  originalFilename: string
  url: string
  isImage: boolean
  // 과거 파일 토큰에서 파생한 자료는 크기를 알 수 없어 null이다.
  fileSize: number | null
  uploaderNickname: string
  createdAt: string
}

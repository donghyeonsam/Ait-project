// 스터디 자료실 도메인 타입. 자료는 그룹톡 파일 토큰 메시지에서 파생한다.

export type StudyMaterialTab = 'image' | 'file'

// 그룹톡 첨부에서 파생한 자료 항목. 채팅 스키마에 없는 파일 크기는 담지 않는다.
export interface StudyMaterialItem {
  id: string
  storedFilename: string
  originalFilename: string
  url: string
  isImage: boolean
  uploaderNickname: string
  createdAt: string
}

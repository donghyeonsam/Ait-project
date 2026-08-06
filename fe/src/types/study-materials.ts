// 스터디 자료실 도메인 타입. 목업 단계이지만 실제 API 교체를 대비해 화면과 분리해 둔다.

export type StudyMaterialTab = 'image' | 'file'

interface StudyMaterialBase {
  id: string
  originalFilename: string
  uploaderNickname: string
  createdAt: string
}

// 이미지 탭에서 모아보기·미리보기로 보여주는 항목.
export interface StudyMaterialImage extends StudyMaterialBase {
  url: string
}

// 파일 탭에서 목록으로 보여주는 항목. 확장자는 파일명에서 파생한다.
export interface StudyMaterialFile extends StudyMaterialBase {
  sizeBytes: number
}

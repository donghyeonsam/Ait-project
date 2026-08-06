// 자료실 화면 확인용 목업 데이터. TODO: 실제 API 연동 필요
import type {
  StudyMaterialFile,
  StudyMaterialImage,
} from '@/types/study-materials'

// 외부 이미지 없이 화면을 확인할 수 있도록 파스텔 그라데이션 SVG를 data URI로 만든다.
function placeholderImage(from: string, to: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="640" height="640" fill="url(#g)"/>` +
    `<circle cx="460" cy="190" r="115" fill="#ffffff" opacity="0.35"/>` +
    `<circle cx="170" cy="470" r="70" fill="#ffffff" opacity="0.2"/>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// 질문 생성 대기 화면 파스텔 팔레트와 뉴트럴 계열만 사용해 목업 이미지 색을 만든다.
const PLACEHOLDER_PALETTES: [string, string][] = [
  ['#DCE6F5', '#CBD9EC'],
  ['#EAE3F2', '#DCE6F5'],
  ['#DDEBE4', '#E7F3EC'],
  ['#F8F3E8', '#EBD4AE'],
  ['#EEF3FA', '#DCE6F5'],
  ['#F1F5F9', '#E2E8F0'],
  ['#E7F3EC', '#DDEBE4'],
  ['#FBEFDD', '#F8F3E8'],
]

const IMAGE_SOURCES: Omit<StudyMaterialImage, 'url'>[] = [
  { id: 'img-1', originalFilename: '모의면접_화이트보드_정리.png', uploaderNickname: '준비된하마', createdAt: '2026-08-05T20:12:00' },
  { id: 'img-2', originalFilename: 'CS_네트워크_필기.jpg', uploaderNickname: '면접왕도전', createdAt: '2026-08-05T18:40:00' },
  { id: 'img-3', originalFilename: '스터디_세션_스크린샷.png', uploaderNickname: '취준생A', createdAt: '2026-08-04T21:03:00' },
  { id: 'img-4', originalFilename: '자기소개_구조도.png', uploaderNickname: '준비된하마', createdAt: '2026-08-03T14:22:00' },
  { id: 'img-5', originalFilename: '기술면접_마인드맵.jpg', uploaderNickname: '커피는연료', createdAt: '2026-08-02T10:15:00' },
  { id: 'img-6', originalFilename: 'STAR_기법_예시.png', uploaderNickname: '면접왕도전', createdAt: '2026-08-01T09:48:00' },
  { id: 'img-7', originalFilename: '운영체제_프로세스_도식.png', uploaderNickname: '취준생A', createdAt: '2026-07-29T22:31:00' },
  { id: 'img-8', originalFilename: '포트폴리오_피드백_메모.jpg', uploaderNickname: '커피는연료', createdAt: '2026-07-27T16:05:00' },
  { id: 'img-9', originalFilename: 'DB_인덱스_판서.png', uploaderNickname: '준비된하마', createdAt: '2026-07-25T19:44:00' },
  { id: 'img-10', originalFilename: '면접_복장_참고.jpg', uploaderNickname: '취준생A', createdAt: '2026-07-22T11:20:00' },
  { id: 'img-11', originalFilename: '스터디_일정표_7월.png', uploaderNickname: '면접왕도전', createdAt: '2026-07-18T08:57:00' },
  { id: 'img-12', originalFilename: '알고리즘_풀이_공유.png', uploaderNickname: '커피는연료', createdAt: '2026-07-14T23:10:00' },
]

export const MOCK_STUDY_MATERIAL_IMAGES: StudyMaterialImage[] =
  IMAGE_SOURCES.map((item, index) => ({
    ...item,
    url: placeholderImage(...PLACEHOLDER_PALETTES[index % PLACEHOLDER_PALETTES.length]),
  }))

export const MOCK_STUDY_MATERIAL_FILES: StudyMaterialFile[] = [
  { id: 'file-1', originalFilename: '기술면접_예상질문_100제.pdf', uploaderNickname: '준비된하마', sizeBytes: 2_431_000, createdAt: '2026-08-05T21:02:00' },
  { id: 'file-2', originalFilename: '자기소개서_첨삭_v3.docx', uploaderNickname: '취준생A', sizeBytes: 84_500, createdAt: '2026-08-04T17:36:00' },
  { id: 'file-3', originalFilename: '모의면접_평가표.xlsx', uploaderNickname: '면접왕도전', sizeBytes: 45_200, createdAt: '2026-08-03T13:11:00' },
  { id: 'file-4', originalFilename: '스터디_발표자료_8월1주.pptx', uploaderNickname: '커피는연료', sizeBytes: 5_872_000, createdAt: '2026-08-01T20:25:00' },
  { id: 'file-5', originalFilename: 'CS_스터디_노트_모음.zip', uploaderNickname: '준비된하마', sizeBytes: 12_640_000, createdAt: '2026-07-28T19:18:00' },
  { id: 'file-6', originalFilename: '면접_회고_템플릿.md', uploaderNickname: '취준생A', sizeBytes: 6_300, createdAt: '2026-07-24T10:42:00' },
  { id: 'file-7', originalFilename: '기업분석_리서치_정리.pdf', uploaderNickname: '커피는연료', sizeBytes: 1_204_000, createdAt: '2026-07-20T15:33:00' },
  { id: 'file-8', originalFilename: '스터디_출석부_7월.xlsx', uploaderNickname: '면접왕도전', sizeBytes: 27_800, createdAt: '2026-07-15T09:05:00' },
]

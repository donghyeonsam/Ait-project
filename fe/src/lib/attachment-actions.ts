// 그룹톡·자료실 첨부에 공통으로 쓰는 다운로드와 클립보드 복사 동작 모음.
import { fetchBackendAssetBlob } from '@/api/http'

// 보호 자원 여부에 맞춰 fetch로 받은 파일을 원본 파일명으로 내려받는다.
export async function downloadAttachment(
  url: string,
  filename: string,
): Promise<void> {
  const blob = await fetchBackendAssetBlob(url)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.hidden = true
  document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(objectUrl)
  }
}

// 클립보드 API가 PNG만 안정적으로 받으므로 다른 포맷은 캔버스로 변환해 복사한다.
export async function copyImageToClipboard(url: string): Promise<void> {
  // Safari는 사용자 제스처 안에서 write가 호출돼야 해서 Blob 준비를 Promise로 넘긴다.
  const pngBlobPromise = fetchBackendAssetBlob(url).then((blob) =>
    blob.type === 'image/png' ? blob : convertToPngBlob(blob),
  )
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': pngBlobPromise }),
  ])
}

async function convertToPngBlob(blob: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('캔버스 컨텍스트를 만들 수 없습니다.')
    context.drawImage(image, 0, 0)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error('이미지 변환에 실패했습니다.')),
        'image/png',
      )
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

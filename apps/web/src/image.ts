// 📌 업로드한 이미지를 브라우저에서 리사이즈·압축해 base64 data URL로 바꾸는 유틸.
// DB에 base64로 저장하므로, 보내기 전에 크기를 줄여 용량을 적당히 유지한다.

const MAX_SIZE = 1000 // 가로/세로 중 긴 변 기준 최대 픽셀
const QUALITY = 0.72 // JPEG 압축 품질

// File을 읽어 data URL 문자열로 변환한다.
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

// data URL을 Image 객체로 로드한다.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
    image.src = src
  })
}

// 이미지 파일을 받아 긴 변 기준 MAX_SIZE로 줄이고 JPEG base64 data URL을 반환한다.
export async function fileToResizedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.')
  }

  const original = await readAsDataUrl(file)
  const img = await loadImage(original)

  const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height))
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('이미지를 처리하지 못했습니다.')
  }
  ctx.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', QUALITY)
}

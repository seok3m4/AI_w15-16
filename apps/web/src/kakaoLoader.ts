// 📌 Kakao 지도 JavaScript SDK를 한 번만 로드하고 재사용하는 헬퍼.
// VITE_KAKAO_MAP_KEY를 사용하며, services 라이브러리(장소 검색)를 함께 불러온다.

// kakao 전역 객체는 외부 SDK가 주입하므로 타입을 any로 둔다.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any
  }
}

// 같은 약속(promise)을 공유해서 SDK script가 중복 삽입되지 않게 한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kakaoPromise: Promise<any> | null = null

// Kakao 지도 SDK를 로드하고 준비가 끝난 kakao 객체를 돌려준다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadKakaoMaps(): Promise<any> {
  if (kakaoPromise) {
    return kakaoPromise
  }

  const key = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined
  if (!key) {
    return Promise.reject(
      new Error('VITE_KAKAO_MAP_KEY가 설정되지 않았습니다. .env에 키를 넣어주세요.'),
    )
  }

  kakaoPromise = new Promise((resolve, reject) => {
    // 이미 로드된 경우 maps.load만 다시 호출한다.
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => resolve(window.kakao))
      return
    }

    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`
    script.async = true
    script.onload = () => {
      // autoload=false라서 명시적으로 maps.load를 호출해야 한다.
      window.kakao.maps.load(() => resolve(window.kakao))
    }
    script.onerror = () =>
      reject(new Error('Kakao 지도 SDK를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })

  return kakaoPromise
}

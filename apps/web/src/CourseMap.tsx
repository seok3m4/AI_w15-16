// 📌 여행 코스 경유지를 지도에 번호 마커 + 경로선으로 보여주는 읽기 전용 컴포넌트.
import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from './kakaoLoader'

// 지도에 표시할 최소 정보. (api의 Place, 작성 중 임시 장소 모두 호환)
export type MapPlace = {
  name: string
  lat: number
  lng: number
}

type Props = {
  places: MapPlace[]
  height?: number
}

export function CourseMap({ places, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!containerRef.current || places.length === 0) return

    let cancelled = false

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return

        const first = places[0]
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(first.lat, first.lng),
          level: 6,
        })

        const bounds = new kakao.maps.LatLngBounds()
        const linePath: unknown[] = []

        places.forEach((place, index) => {
          const position = new kakao.maps.LatLng(place.lat, place.lng)
          bounds.extend(position)
          linePath.push(position)

          // 방문 순서를 보여주는 번호 마커.
          const pin = new kakao.maps.CustomOverlay({
            position,
            yAnchor: 1,
            content: `<div class="map-pin">${index + 1}</div>`,
          })
          pin.setMap(map)
        })

        // 경유지를 순서대로 잇는 경로선.
        if (linePath.length > 1) {
          const polyline = new kakao.maps.Polyline({
            path: linePath,
            strokeWeight: 4,
            strokeColor: '#0071e3',
            strokeOpacity: 0.9,
            strokeStyle: 'solid',
          })
          polyline.setMap(map)
          map.setBounds(bounds)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '지도를 불러오지 못했습니다.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [places])

  if (places.length === 0) {
    return null
  }

  if (error) {
    return <p className="status-text map-error">지도를 불러오지 못했습니다. ({error})</p>
  }

  return <div className="course-map" ref={containerRef} style={{ height }} />
}

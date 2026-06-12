// 📌 게시글 작성/수정 화면에서 코스 경유지를 검색·추가·정렬하는 편집기.
import { useState } from 'react'
import { CourseMap } from './CourseMap'
import { loadKakaoMaps } from './kakaoLoader'

// 작성 중인 경유지. (저장 전이라 DB id가 아직 없다)
export type PlaceDraft = {
  name: string
  address?: string
  lat: number
  lng: number
}

// Kakao 장소 검색 결과 한 건에서 우리가 쓰는 필드.
type KakaoPlace = {
  place_name: string
  address_name?: string
  road_address_name?: string
  x: string // 경도(lng)
  y: string // 위도(lat)
}

type Props = {
  places: PlaceDraft[]
  onChange: (next: PlaceDraft[]) => void
}

export function PlaceEditor({ places, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KakaoPlace[]>([])
  const [error, setError] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // 입력한 키워드로 Kakao 장소 검색을 수행한다.
  async function handleSearch() {
    const keyword = query.trim()
    if (!keyword) return

    setError('')
    setIsSearching(true)

    try {
      const kakao = await loadKakaoMaps()
      const ps = new kakao.maps.services.Places()

      ps.keywordSearch(keyword, (data: KakaoPlace[], status: string) => {
        setIsSearching(false)
        if (status === kakao.maps.services.Status.OK) {
          setResults(data.slice(0, 8))
        } else {
          setResults([])
          setError('검색 결과가 없습니다.')
        }
      })
    } catch (err) {
      setIsSearching(false)
      setError(
        err instanceof Error ? err.message : '장소 검색에 실패했습니다.',
      )
    }
  }

  // 검색 결과를 코스 경유지 목록 끝에 추가한다.
  function addPlace(result: KakaoPlace) {
    const next: PlaceDraft = {
      name: result.place_name,
      address: result.road_address_name || result.address_name,
      lat: Number(result.y),
      lng: Number(result.x),
    }
    onChange([...places, next])
  }

  function removePlace(index: number) {
    onChange(places.filter((_, i) => i !== index))
  }

  // 경유지를 위/아래로 옮겨 방문 순서를 조정한다.
  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= places.length) return
    const next = [...places]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="place-editor">
      <div className="place-search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSearch()
            }
          }}
          placeholder="장소 검색 (예: 성산일출봉, 에펠탑)"
        />
        <button
          type="button"
          className="secondary-button"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? '검색 중...' : '검색'}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {results.length > 0 && (
        <ul className="place-results">
          {results.map((result, index) => (
            <li key={`${result.place_name}-${index}`}>
              <div className="place-result-info">
                <strong>{result.place_name}</strong>
                <span>{result.road_address_name || result.address_name}</span>
              </div>
              <button
                type="button"
                className="place-add"
                onClick={() => addPlace(result)}
              >
                추가
              </button>
            </li>
          ))}
        </ul>
      )}

      {places.length > 0 ? (
        <>
          <ol className="place-course">
            {places.map((place, index) => (
              <li key={`${place.name}-${index}`}>
                <span className="place-order">{index + 1}</span>
                <div className="place-course-info">
                  <strong>{place.name}</strong>
                  {place.address && <span>{place.address}</span>}
                </div>
                <div className="place-course-actions">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="위로"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === places.length - 1}
                    aria-label="아래로"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="place-remove"
                    onClick={() => removePlace(index)}
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <CourseMap places={places} height={260} />
        </>
      ) : (
        <p className="status-text">
          장소를 검색해 코스에 추가하면 지도에 순서대로 표시됩니다.
        </p>
      )}
    </div>
  )
}

// 📌 게시글 작성/수정 화면에서 코스 경유지를 일차별로 검색·추가하고
//    드래그 앤 드롭으로 순서·일차를 조정하는 편집기.
import { useState, type DragEvent } from "react";
import { CourseMap } from "./CourseMap";
import { loadKakaoMaps } from "./kakaoLoader";

// 작성 중인 경유지. (저장 전이라 DB id가 아직 없다)
export type PlaceDraft = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  day: number;
};

// Kakao 장소 검색 결과 한 건에서 우리가 쓰는 필드.
type KakaoPlace = {
  place_name: string;
  address_name?: string;
  road_address_name?: string;
  x: string; // 경도(lng)
  y: string; // 위도(lat)
};

type Props = {
  places: PlaceDraft[];
  onChange: (next: PlaceDraft[]) => void;
  // 여행 기간(일). 이 값만큼 일차 탭이 자동으로 만들어진다.
  totalDays: number;
};

type DropPosition = "before" | "after";

type DropTarget = {
  index: number;
  position: DropPosition;
};

export function PlaceEditor({ places, onChange, totalDays }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  // 지금 검색해서 추가할 장소가 들어갈 "일차". 기본 1일차.
  const [activeDay, setActiveDay] = useState(1);
  // 드래그 중인 경유지의 원본 인덱스.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // 드롭하면 어떤 카드의 위/아래에 들어갈지 표시하는 상태.
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  // 여행 기간이 줄어도 이미 입력한 장소가 사라지지 않도록,
  // (기간) 과 (실제 장소들의 최대 일차) 중 큰 값까지 일차를 보여준다.
  const maxPlaceDay = places.reduce((max, p) => Math.max(max, p.day), 1);
  const dayCount = Math.max(totalDays, maxPlaceDay);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  // activeDay가 표시 범위를 벗어나면 1일차로 보정.
  const safeActiveDay = activeDay > dayCount ? 1 : activeDay;

  // places를 일차 순서대로 안정 정렬해 onChange로 넘긴다. (같은 일차 내 순서는 유지)
  function commit(next: PlaceDraft[]) {
    const sorted = [...next].sort((a, b) => a.day - b.day);
    onChange(sorted);
  }

  // 입력한 키워드로 Kakao 장소 검색을 수행한다.
  async function handleSearch() {
    const keyword = query.trim();
    if (!keyword) return;

    setError("");
    setIsSearching(true);

    try {
      const kakao = await loadKakaoMaps();
      const ps = new kakao.maps.services.Places();

      ps.keywordSearch(keyword, (data: KakaoPlace[], status: string) => {
        setIsSearching(false);
        if (status === kakao.maps.services.Status.OK) {
          setResults(data.slice(0, 8));
        } else {
          setResults([]);
          setError("검색 결과가 없습니다.");
        }
      });
    } catch (err) {
      setIsSearching(false);
      setError(
        err instanceof Error ? err.message : "장소 검색에 실패했습니다.",
      );
    }
  }

  // 검색 결과를 "현재 선택된 일차"에 추가하고, 검색 결과 목록은 닫는다.
  function addPlace(result: KakaoPlace) {
    const next: PlaceDraft = {
      name: result.place_name,
      address: result.road_address_name || result.address_name,
      lat: Number(result.y),
      lng: Number(result.x),
      day: safeActiveDay,
    };
    commit([...places, next]);
    setResults([]);
    setQuery("");
    setError("");
  }

  function removePlace(index: number) {
    commit(places.filter((_, i) => i !== index));
  }

  // 드래그 관련 상태를 한 번에 초기화한다.
  function resetDragState() {
    setDragIndex(null);
    setDropTarget(null);
  }

  // 마우스가 카드의 위쪽 절반이면 before, 아래쪽 절반이면 after로 판단한다.
  function getDropPosition(event: DragEvent<HTMLElement>): DropPosition {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }

  // 드래그한 경유지를 "타겟 경유지"의 앞/뒤로 옮긴다. (타겟의 일차를 따라간다)
  function dropOnPlace(targetIndex: number, position: DropPosition) {
    if (dragIndex === null || dragIndex === targetIndex) {
      resetDragState();
      return;
    }

    const target = places[targetIndex];
    const moved = { ...places[dragIndex], day: target.day };
    const next = places.filter((_, index) => index !== dragIndex);
    const targetIndexAfterRemove = next.findIndex((place) => place === target);

    if (targetIndexAfterRemove === -1) {
      resetDragState();
      return;
    }

    const insertAt =
      position === "before" ? targetIndexAfterRemove : targetIndexAfterRemove + 1;
    next.splice(insertAt, 0, moved);
    commit(next);
    resetDragState();
  }

  // 드래그한 경유지를 특정 일차(그룹)의 끝으로 옮긴다. (빈 일차에 드롭할 때)
  function dropOnDay(day: number) {
    if (dragIndex === null) {
      resetDragState();
      return;
    }
    const next = [...places];
    const moved = { ...next[dragIndex], day };
    next.splice(dragIndex, 1);
    next.push(moved); // commit이 일차 순으로 정렬하므로 해당 일차 그룹 끝으로 간다
    commit(next);
    resetDragState();
  }

  return (
    <div className="place-editor">
      {/* 1) 추가할 일차 선택 (여행 기간만큼 자동 생성) */}
      <div className="day-picker">
        <span className="day-picker-label">
          장소를 추가할 일차 선택{" "}
          <em>(여행 기간 {totalDays}일 기준)</em>
        </span>
        <div className="day-tabs">
          {days.map((day) => (
            <button
              type="button"
              key={day}
              className={day === safeActiveDay ? "day-tab active" : "day-tab"}
              onClick={() => setActiveDay(day)}
            >
              {day}일차
            </button>
          ))}
        </div>
      </div>

      {/* 2) 장소 검색 */}
      <div className="place-search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSearch();
            }
          }}
          placeholder={`${safeActiveDay}일차에 추가할 장소 검색 (예: 성산일출봉)`}
        />
        <button
          type="button"
          className="secondary-button"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? "검색 중..." : "검색"}
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

      {/* 3) 코스 목록 (일차별 그룹 · 드래그로 이동) */}
      {places.length > 0 ? (
        <>
          <p className="place-drag-hint">
            💡 장소를 드래그해서 순서를 바꾸거나 다른 일차로 옮길 수 있어요.
          </p>
          <div className="place-course-days">
            {days.map((day) => {
              const items = places
                .map((p, i) => ({ p, i }))
                .filter((x) => x.p.day === day);
              const isEmptyDay = items.length === 0;
              return (
                <div
                  className={
                    isEmptyDay && dragIndex !== null
                      ? "place-day-group drop-target"
                      : "place-day-group"
                  }
                  key={day}
                  // 빈 일차에만 그룹 드롭을 허용한다. 장소가 있는 일차의 여백은 순서 변경을 방해하지 않는다.
                  onDragOver={
                    isEmptyDay
                      ? (event) => {
                          event.preventDefault();
                        }
                      : undefined
                  }
                  onDrop={isEmptyDay ? () => dropOnDay(day) : undefined}
                >
                  <p className="place-day-heading">{day}일차</p>
                  {isEmptyDay ? (
                    <p className="place-day-empty">
                      여기로 장소를 드래그하거나, 위에서 {day}일차를 선택해
                      추가하세요.
                    </p>
                  ) : (
                    <ol className="place-course">
                      {items.map(({ p, i }, posInDay) => (
                        <li
                          key={`${p.name}-${i}`}
                          className={[
                            dragIndex === i ? "is-dragging" : "",
                            dropTarget?.index === i &&
                            dropTarget.position === "before"
                              ? "drop-before"
                              : "",
                            dropTarget?.index === i &&
                            dropTarget.position === "after"
                              ? "drop-after"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          draggable
                          onDragStart={() => {
                            setDragIndex(i);
                            setDropTarget(null);
                          }}
                          onDragEnd={resetDragState}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (dragIndex === null || dragIndex === i) {
                              setDropTarget(null);
                              return;
                            }
                            setDropTarget({
                              index: i,
                              position: getDropPosition(event),
                            });
                          }}
                          onDragLeave={(event) => {
                            const nextTarget = event.relatedTarget;
                            if (
                              !(nextTarget instanceof Node) ||
                              !event.currentTarget.contains(nextTarget)
                            ) {
                              setDropTarget((current) =>
                                current?.index === i ? null : current,
                              );
                            }
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const position =
                              dropTarget?.index === i
                                ? dropTarget.position
                                : getDropPosition(event);
                            dropOnPlace(i, position);
                          }}
                        >
                          <span className="place-drag-handle" aria-hidden>
                            ⠿
                          </span>
                          <span className="place-order">{posInDay + 1}</span>
                          <div className="place-course-info">
                            <strong>{p.name}</strong>
                            {p.address && <span>{p.address}</span>}
                          </div>
                          <button
                            type="button"
                            className="place-remove"
                            onClick={() => removePlace(i)}
                            aria-label="삭제"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
          <CourseMap places={places} height={260} />
        </>
      ) : (
        <p className="status-text">
          일차를 고르고 장소를 검색해 추가하면 지도에 순서대로 표시됩니다.
        </p>
      )}
    </div>
  );
}

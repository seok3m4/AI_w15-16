// 📌 여행 코스 경유지를 지도에 번호 마커 + 경로선으로 보여주는 읽기 전용 컴포넌트.
import { useEffect, useMemo, useRef, useState } from "react";
import { loadKakaoMaps } from "./kakaoLoader";

// 지도에 표시할 최소 정보. (api의 Place, 작성 중 임시 장소 모두 호환)
export type MapPlace = {
  name: string;
  lat: number;
  lng: number;
  day?: number;
};

type NumberedMapPlace = MapPlace & {
  courseOrder: number;
};

type Props = {
  places: MapPlace[];
  height?: number;
};

export function CourseMap({ places, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | "all" | null>(null);

  const days = useMemo(
    () =>
      [...new Set(places.map((place) => place.day ?? 1))].sort((a, b) => a - b),
    [places],
  );
  const showDayTabs = days.length > 1;
  const activeDay: number | "all" =
    selectedDay === "all"
      ? "all"
      : selectedDay !== null && days.includes(selectedDay)
        ? selectedDay
        : (showDayTabs ? days[0] : "all") ?? "all";
  const numberedPlaces = useMemo<NumberedMapPlace[]>(
    () =>
      places.map((place, index) => ({
        ...place,
        courseOrder: index + 1,
      })),
    [places],
  );
  const visiblePlaces = useMemo(
    () =>
      activeDay === "all"
        ? numberedPlaces
        : numberedPlaces.filter((place) => (place.day ?? 1) === activeDay),
    [numberedPlaces, activeDay],
  );

  useEffect(() => {
    if (!containerRef.current || visiblePlaces.length === 0) return;

    let cancelled = false;

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;

        // 선택한 일차가 바뀔 때 이전 지도 DOM을 비워 새 경로선/마커만 보이게 한다.
        containerRef.current.replaceChildren();

        const first = visiblePlaces[0];
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(first.lat, first.lng),
          level: 6,
        });

        const bounds = new kakao.maps.LatLngBounds();
        const linePath: unknown[] = [];

        visiblePlaces.forEach((place) => {
          const position = new kakao.maps.LatLng(place.lat, place.lng);
          bounds.extend(position);
          linePath.push(position);

          // 방문 순서를 보여주는 번호 마커.
          const pin = new kakao.maps.CustomOverlay({
            position,
            xAnchor: 0.5,
            yAnchor: 0.5,
            zIndex: 2,
            content: `<div class="course-map-pin">${place.courseOrder}</div>`,
          });
          pin.setMap(map);
        });

        // 경유지를 순서대로 잇는 경로선.
        if (linePath.length > 1) {
          const polyline = new kakao.maps.Polyline({
            path: linePath,
            strokeWeight: 4,
            strokeColor: "#0071e3",
            strokeOpacity: 0.9,
            strokeStyle: "solid",
            zIndex: 1,
          });
          polyline.setMap(map);
          map.setBounds(bounds);
        } else {
          map.setCenter(new kakao.maps.LatLng(first.lat, first.lng));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "지도를 불러오지 못했습니다.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visiblePlaces]);

  if (places.length === 0) {
    return null;
  }

  if (error) {
    return (
      <p className="status-text map-error">
        지도를 불러오지 못했습니다. ({error})
      </p>
    );
  }

  return (
    <div className="course-map-shell">
      {showDayTabs && (
        <div className="map-day-tabs" aria-label="지도 일차 선택">
          <button
            type="button"
            className={activeDay === "all" ? "active" : ""}
            onClick={() => setSelectedDay("all")}
          >
            전체
          </button>
          {days.map((day) => (
            <button
              type="button"
              className={activeDay === day ? "active" : ""}
              key={day}
              onClick={() => setSelectedDay(day)}
            >
              {day}일차
            </button>
          ))}
        </div>
      )}
      <div className="course-map" ref={containerRef} style={{ height }} />
    </div>
  );
}

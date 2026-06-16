import type { BoardPostSummary } from "../../board/api/posts";
import type { EconomicEvent, ReportItem } from "../../economy/api/economy";
import type { LocaleCode } from "../../../i18n/i18n";

export interface HomeSearchResponse {
  query: string;
  discussions: BoardPostSummary[];
  events: EconomicEvent[];
  reports: ReportItem[];
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchHomeSearch(
  query: string,
  locale?: LocaleCode,
): Promise<HomeSearchResponse> {
  const params = new URLSearchParams({ query });
  if (locale) {
    params.set("locale", locale);
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/search/home?${params}`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      throw new Error("로그인이 필요합니다.");
    }
    if (!response.ok) {
      throw new Error(`검색 요청 실패: ${response.status}`);
    }

    return response.json() as Promise<HomeSearchResponse>;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("검색 서버에 연결할 수 없습니다.");
    }
    throw error;
  }
}

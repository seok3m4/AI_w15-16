import { NextResponse } from "next/server";

export const runtime = "nodejs";

type NaverRelayState = {
  homeScore?: string | number | null;
  awayScore?: string | number | null;
  strike?: string | number | null;
  ball?: string | number | null;
  out?: string | number | null;
  base1?: string | number | null;
  base2?: string | number | null;
  base3?: string | number | null;
};

type NaverRelayOption = {
  seqno?: number | string | null;
  text?: string | null;
  type?: number | string | null;
  speed?: string | number | null;
  stuff?: string | null;
  currentGameState?: NaverRelayState | null;
};

type NaverRelayGroup = {
  no?: number | string | null;
  inn?: number | string | null;
  homeOrAway?: string | null;
  title?: string | null;
  textOptions?: NaverRelayOption[] | null;
};

type NaverRelayResponse = {
  code?: number;
  success?: boolean;
  result?: {
    textRelayData?: {
      textRelays?: NaverRelayGroup[] | null;
    } | null;
  };
};

type RelayEvent = {
  id: string;
  text: string;
  pitchText: string;
  countText: string;
  baseText: string;
};

type RelayGroup = {
  id: string;
  inning: number | null;
  half: string;
  title: string;
  events: RelayEvent[];
};

const NAVER_SPORTS_API_BASE_URL = "https://api-gw.sports.naver.com";

function getStringParam(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNumberParam(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getBoundedLimit(value: string | null): number {
  const limit = Number(value);

  if (!Number.isFinite(limit)) {
    return 8;
  }

  return Math.min(Math.max(Math.floor(limit), 1), 20);
}

function getInningParam(value: string | null): number | null {
  const inning = Number(value);

  if (!Number.isInteger(inning) || inning < 1 || inning > 9) {
    return null;
  }

  return inning;
}

function toNaverGameId(gameId: string, gameDate: string): string {
  const trimmedGameId = gameId.trim().toUpperCase();

  if (/^\d{8}[A-Z]{4}\d\d{4}$/.test(trimmedGameId)) {
    return trimmedGameId;
  }

  if (/^\d{8}[A-Z]{4}\d$/.test(trimmedGameId)) {
    return `${trimmedGameId}${gameDate.slice(0, 4) || trimmedGameId.slice(0, 4)}`;
  }

  throw new Error("네이버 문자중계용 경기 ID를 만들 수 없습니다.");
}

function cleanRelayText(value: unknown): string {
  return getStringParam(value)
    .replace(/=+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getHalfText(value: unknown): string {
  const half = getStringParam(value);

  if (half === "0") {
    return "초";
  }

  if (half === "1") {
    return "말";
  }

  return "";
}

function hasBaseRunner(value: unknown): boolean {
  const runner = getNumberParam(value);

  return runner !== null && runner > 0;
}

function getCountText(state: NaverRelayState | null | undefined): string {
  if (!state) {
    return "";
  }

  return [
    state.ball !== null && state.ball !== undefined ? `B ${state.ball}` : "",
    state.strike !== null && state.strike !== undefined
      ? `S ${state.strike}`
      : "",
    state.out !== null && state.out !== undefined ? `O ${state.out}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function getBaseText(state: NaverRelayState | null | undefined): string {
  if (!state) {
    return "";
  }

  const bases = [
    hasBaseRunner(state.base1) ? "1루" : "",
    hasBaseRunner(state.base2) ? "2루" : "",
    hasBaseRunner(state.base3) ? "3루" : "",
  ].filter(Boolean);

  return bases.length > 0 ? `주자 ${bases.join(", ")}` : "주자 없음";
}

function getPitchText(option: NaverRelayOption): string {
  return [option.speed ? `${option.speed}km` : "", getStringParam(option.stuff)]
    .filter(Boolean)
    .join(" · ");
}

function toRelayEvent(option: NaverRelayOption): RelayEvent | null {
  const text = cleanRelayText(option.text);

  if (!text) {
    return null;
  }

  return {
    id: String(option.seqno ?? text),
    text,
    pitchText: getPitchText(option),
    countText: getCountText(option.currentGameState),
    baseText: getBaseText(option.currentGameState),
  };
}

function toRelayGroup(group: NaverRelayGroup): RelayGroup | null {
  const title = cleanRelayText(group.title);
  const events = (group.textOptions ?? [])
    .map(toRelayEvent)
    .filter((event): event is RelayEvent => Boolean(event));

  if (!title && events.length === 0) {
    return null;
  }

  return {
    id: String(group.no ?? title),
    inning: getNumberParam(group.inn),
    half: getHalfText(group.homeOrAway),
    title,
    events,
  };
}

async function fetchNaverRelay(
  gameId: string,
  inning: number | null,
): Promise<NaverRelayResponse> {
  const relayUrl = new URL(
    `${NAVER_SPORTS_API_BASE_URL}/schedule/games/${gameId}/relay`,
  );

  if (inning !== null) {
    relayUrl.searchParams.set("inning", String(inning));
  }

  const response = await fetch(
    relayUrl,
    {
      headers: {
        Accept: "application/json,text/plain,*/*",
        Referer: `https://m.sports.naver.com/game/${gameId}/relay`,
        "X-Sports-Backend": "kotlin",
      },
      next: {
        revalidate: 10,
      },
    },
  );

  if (!response.ok) {
    throw new Error("네이버 문자중계를 불러오지 못했습니다.");
  }

  return (await response.json()) as NaverRelayResponse;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = getStringParam(searchParams.get("gameId"));
  const gameDate = getStringParam(searchParams.get("date"));
  const limit = getBoundedLimit(searchParams.get("limit"));
  const selectedInning = getInningParam(searchParams.get("inning"));

  if (!gameId) {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "gameId가 필요합니다.",
      },
      { status: 400 },
    );
  }

  try {
    const naverGameId = toNaverGameId(gameId, gameDate);
    const data = await fetchNaverRelay(naverGameId, selectedInning);
    const relayGroups = (data.result?.textRelayData?.textRelays ?? [])
      .map(toRelayGroup)
      .filter((group): group is RelayGroup => Boolean(group));
    const groups = relayGroups
      .filter((group) =>
        selectedInning === null ? true : group.inning === selectedInning,
      )
      .slice(0, limit);

    return NextResponse.json({
      status: "ready",
      result: {
        gameId: naverGameId,
        selectedInning,
        source: `https://m.sports.naver.com/game/${naverGameId}/relay`,
        groups,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "문자중계를 불러오지 못했습니다.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

export type PlayerRecordType = "hitter" | "pitcher";

export type PlayerRecord = {
  ranking: number;
  playerId: string;
  playerName: string;
  playerImageUrl: string | null;
  teamName: string;
  teamId: string;
  teamImageUrl: string | null;
  position: string;
  backNumber: number | null;
  isQualified: boolean;
  hitter?: {
    battingAverage: number | null;
    games: number | null;
    atBats: number | null;
    hits: number | null;
    homeRuns: number | null;
    rbi: number | null;
    runs: number | null;
    steals: number | null;
    obp: number | null;
    slg: number | null;
    ops: number | null;
    war: number | null;
  };
  pitcher?: {
    era: number | null;
    games: number | null;
    wins: number | null;
    losses: number | null;
    saves: number | null;
    holds: number | null;
    innings: string;
    strikeouts: number | null;
    whip: number | null;
    qs: number | null;
    war: number | null;
  };
};

export type PlayerRecordsResult = {
  source: string;
  apiSource: string;
  fetchedAt: string;
  season: string;
  type: PlayerRecordType;
  sortField: string;
  sortDirection: "asc" | "desc";
  page: number;
  pageSize: number;
  records: PlayerRecord[];
};

type FetchPlayerRecordsOptions = {
  season?: string;
  type?: string;
  sortField?: string;
  sortDirection?: string;
  page?: number;
  pageSize?: number;
  forceRefresh?: boolean;
};

const NAVER_RECORD_PAGE_URL = "https://m.sports.naver.com/kbaseball/record/kbo";
const NAVER_SPORTS_API_BASE_URL = "https://api-gw.sports.naver.com";
const PLAYER_RECORDS_CACHE_TTL_MS = 60_000;
const DEFAULT_SEASON = "2026";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 80;
const MAX_PAGE_SIZE = 100;

const playerRecordCache = new Map<
  string,
  {
    expiresAt: number;
    result: PlayerRecordsResult;
  }
>();

const sortFields = {
  hitter: new Map([
    ["hitterHra", "desc"],
    ["hitterHr", "desc"],
    ["hitterRbi", "desc"],
    ["hitterOps", "desc"],
    ["hitterWar", "desc"],
    ["hitterSb", "desc"],
  ]),
  pitcher: new Map([
    ["pitcherEra", "asc"],
    ["pitcherWin", "desc"],
    ["pitcherSave", "desc"],
    ["pitcherHold", "desc"],
    ["pitcherKk", "desc"],
    ["pitcherWhip", "asc"],
    ["pitcherWar", "desc"],
  ]),
} satisfies Record<PlayerRecordType, Map<string, "asc" | "desc">>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "Y";
}

function normalizeRecordType(value: string | undefined): PlayerRecordType {
  return value === "pitcher" ? "pitcher" : "hitter";
}

function normalizeSeason(value: string | undefined): string {
  const season = value?.trim() || DEFAULT_SEASON;

  return /^\d{4}$/.test(season) ? season : DEFAULT_SEASON;
}

function normalizePage(value: number | undefined): number {
  return Number.isInteger(value) && value && value > 0 ? value : DEFAULT_PAGE;
}

function normalizePageSize(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(value, MAX_PAGE_SIZE);
}

function getDefaultSortField(type: PlayerRecordType): string {
  return type === "hitter" ? "hitterHra" : "pitcherEra";
}

function normalizeSortField(
  type: PlayerRecordType,
  value: string | undefined,
): string {
  const fields = sortFields[type];

  return value && fields.has(value) ? value : getDefaultSortField(type);
}

function normalizeSortDirection(
  type: PlayerRecordType,
  sortField: string,
  value: string | undefined,
): "asc" | "desc" {
  if (value === "asc" || value === "desc") {
    return value;
  }

  return sortFields[type].get(sortField) ?? "desc";
}

function getRanking(value: unknown, fallbackRanking: number): number {
  const ranking = getNumber(value);

  return ranking && ranking > 0 ? ranking : fallbackRanking;
}

function parseProfile(value: unknown): { imageUrl: string; position: string } {
  const profileText = getString(value);

  if (!profileText) {
    return { imageUrl: "", position: "" };
  }

  try {
    const profile = JSON.parse(profileText) as unknown;

    return isRecord(profile)
      ? {
          imageUrl: getString(profile.image),
          position: getString(profile.position),
        }
      : { imageUrl: "", position: "" };
  } catch {
    return { imageUrl: "", position: "" };
  }
}

function getNaverRecordPageUrl(type: PlayerRecordType, season: string): string {
  const url = new URL(NAVER_RECORD_PAGE_URL);

  url.searchParams.set("seasonCode", season);
  url.searchParams.set("tab", type);

  return url.toString();
}

function getApiUrl(input: {
  season: string;
  type: PlayerRecordType;
  sortField: string;
  sortDirection: "asc" | "desc";
  page: number;
  pageSize: number;
}): string {
  const url = new URL(
    `/statistics/categories/kbo/seasons/${input.season}/players`,
    NAVER_SPORTS_API_BASE_URL,
  );

  url.searchParams.set("playerType", input.type === "hitter" ? "HITTER" : "PITCHER");
  url.searchParams.set("sortField", input.sortField);
  url.searchParams.set("sortDirection", input.sortDirection);
  url.searchParams.set("page", String(input.page));
  url.searchParams.set("pageSize", String(input.pageSize));

  return url.toString();
}

function normalizeHitterRecord(
  value: Record<string, unknown>,
  fallbackRanking: number,
): PlayerRecord {
  const profile = parseProfile(value.profile);

  return {
    ranking: getRanking(value.ranking, fallbackRanking),
    playerId: getString(value.playerId),
    playerName: getString(value.playerName),
    playerImageUrl: getString(value.playerImageUrl) || profile.imageUrl || null,
    teamName: getString(value.teamName),
    teamId: getString(value.teamId),
    teamImageUrl: getString(value.teamImageUrl) || null,
    position: profile.position,
    backNumber: getNumber(value.backNumber),
    isQualified: getBoolean(value.isQualified),
    hitter: {
      battingAverage: getNumber(value.hitterHra),
      games: getNumber(value.hitterGameCount),
      atBats: getNumber(value.hitterAb),
      hits: getNumber(value.hitterHit),
      homeRuns: getNumber(value.hitterHr),
      rbi: getNumber(value.hitterRbi),
      runs: getNumber(value.hitterRun),
      steals: getNumber(value.hitterSb),
      obp: getNumber(value.hitterObp),
      slg: getNumber(value.hitterSlg),
      ops: getNumber(value.hitterOps),
      war: getNumber(value.hitterWar),
    },
  };
}

function normalizePitcherRecord(
  value: Record<string, unknown>,
  fallbackRanking: number,
): PlayerRecord {
  const profile = parseProfile(value.profile);

  return {
    ranking: getRanking(value.ranking, fallbackRanking),
    playerId: getString(value.playerId),
    playerName: getString(value.playerName),
    playerImageUrl: getString(value.playerImageUrl) || profile.imageUrl || null,
    teamName: getString(value.teamName),
    teamId: getString(value.teamId),
    teamImageUrl: getString(value.teamImageUrl) || null,
    position: profile.position || "투수",
    backNumber: getNumber(value.backNumber),
    isQualified: getBoolean(value.isQualified),
    pitcher: {
      era: getNumber(value.pitcherEra),
      games: getNumber(value.pitcherGameCount),
      wins: getNumber(value.pitcherWin),
      losses: getNumber(value.pitcherLose),
      saves: getNumber(value.pitcherSave),
      holds: getNumber(value.pitcherHold),
      innings: getString(value.pitcherInning),
      strikeouts: getNumber(value.pitcherKk),
      whip: getNumber(value.pitcherWhip),
      qs: getNumber(value.pitcherQs),
      war: getNumber(value.pitcherWar),
    },
  };
}

function normalizeRecords(
  value: unknown,
  type: PlayerRecordType,
  page: number,
  pageSize: number,
): PlayerRecord[] {
  if (!isRecord(value) || !Array.isArray(value.seasonPlayerStats)) {
    return [];
  }

  const pageOffset = (page - 1) * pageSize;

  return value.seasonPlayerStats
    .filter(isRecord)
    .map((record, index) =>
      type === "hitter"
        ? normalizeHitterRecord(record, pageOffset + index + 1)
        : normalizePitcherRecord(record, pageOffset + index + 1),
    )
    .filter((record) => record.playerId && record.playerName);
}

async function fetchNaverPlayerRecords(apiSource: string): Promise<unknown> {
  const response = await fetch(apiSource, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      Origin: "https://m.sports.naver.com",
      Referer: "https://m.sports.naver.com/",
      "User-Agent": "BaseballAIBoard/0.1 Naver player records reader",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(
      `Naver player records request failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as unknown;

  if (!isRecord(data) || data.success !== true || !isRecord(data.result)) {
    throw new Error("Naver player records response is invalid.");
  }

  return data.result;
}

export async function fetchPlayerRecords(
  options?: FetchPlayerRecordsOptions,
): Promise<PlayerRecordsResult> {
  const type = normalizeRecordType(options?.type);
  const season = normalizeSeason(options?.season);
  const page = normalizePage(options?.page);
  const pageSize = normalizePageSize(options?.pageSize);
  const sortField = normalizeSortField(type, options?.sortField);
  const sortDirection = normalizeSortDirection(
    type,
    sortField,
    options?.sortDirection,
  );
  const source = getNaverRecordPageUrl(type, season);
  const apiSource = getApiUrl({
    season,
    type,
    sortField,
    sortDirection,
    page,
    pageSize,
  });
  const cacheKey = `${season}:${type}:${sortField}:${sortDirection}:${page}:${pageSize}`;
  const cached = playerRecordCache.get(cacheKey);

  if (!options?.forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const resultData = await fetchNaverPlayerRecords(apiSource);
  const result: PlayerRecordsResult = {
    source,
    apiSource,
    fetchedAt: new Date().toISOString(),
    season,
    type,
    sortField,
    sortDirection,
    page,
    pageSize,
    records: normalizeRecords(resultData, type, page, pageSize),
  };

  playerRecordCache.set(cacheKey, {
    expiresAt: Date.now() + PLAYER_RECORDS_CACHE_TTL_MS,
    result,
  });

  return result;
}

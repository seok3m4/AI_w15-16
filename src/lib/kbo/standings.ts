export type KboStandingRow = {
  rank: number;
  team: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winningRate: string;
  gamesBehind: string;
  lastTenGames: string;
  streak: string;
  homeRecord: string;
  awayRecord: string;
};

export type KboStandingsResult = {
  source: string;
  fetchedAt: string;
  seasonYear: number;
  rows: KboStandingRow[];
};

const KBO_BASE_URL = "https://www.koreabaseball.com";
export const KBO_STANDINGS_URL = `${KBO_BASE_URL}/Record/TeamRank/TeamRank.aspx`;

const STANDINGS_CACHE_TTL_MS = 60_000;
const KBO_TEAMS = ["LG", "KT", "삼성", "KIA", "한화", "두산", "NC", "SSG", "롯데", "키움"];
const TEAM_PATTERN = KBO_TEAMS.join("|");

let kboStandingsCache:
  | {
      expiresAt: number;
      result: KboStandingsResult;
    }
  | null = null;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .trim();
}

function stripHtml(value: string): string {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCurrentKoreanSeasonYear(): number {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).format(new Date()),
  );
}

function parseNumber(value: string): number {
  return Number(value);
}

export function parseKboStandings(html: string): KboStandingRow[] {
  const text = stripHtml(html);
  const tableStart = text.indexOf("순위 팀명 경기 승 패 무 승률");
  const tableEnd = text.indexOf("팀간 승패표", tableStart);
  const tableText =
    tableStart >= 0 && tableEnd > tableStart
      ? text.slice(tableStart, tableEnd)
      : text;
  const rowPattern = new RegExp(
    `(?:^|\\s)(10|[1-9])\\s+(${TEAM_PATTERN})\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+([\\d.]+)\\s+([\\d.-]+)\\s+(\\d+승\\d+무\\d+패)\\s+(\\d+(?:승|패|무))\\s+(\\d+-\\d+-\\d+)\\s+(\\d+-\\d+-\\d+)`,
    "g",
  );

  return [...tableText.matchAll(rowPattern)].map((match) => ({
    rank: parseNumber(match[1]),
    team: match[2],
    games: parseNumber(match[3]),
    wins: parseNumber(match[4]),
    losses: parseNumber(match[5]),
    draws: parseNumber(match[6]),
    winningRate: match[7],
    gamesBehind: match[8],
    lastTenGames: match[9],
    streak: match[10],
    homeRecord: match[11],
    awayRecord: match[12],
  }));
}

async function fetchKboStandingsHtml(): Promise<string> {
  const response = await fetch(KBO_STANDINGS_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: KBO_BASE_URL,
      "User-Agent": "BaseballAIBoard/0.1 KBO official standings reader",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(
      `KBO standings request failed with status ${response.status}.`,
    );
  }

  return response.text();
}

export async function fetchKboStandings(options?: {
  forceRefresh?: boolean;
}): Promise<KboStandingsResult> {
  if (
    !options?.forceRefresh &&
    kboStandingsCache &&
    kboStandingsCache.expiresAt > Date.now()
  ) {
    return kboStandingsCache.result;
  }

  const html = await fetchKboStandingsHtml();
  const rows = parseKboStandings(html);

  if (rows.length === 0) {
    throw new Error("KBO standings table could not be parsed.");
  }

  const result: KboStandingsResult = {
    source: KBO_STANDINGS_URL,
    fetchedAt: new Date().toISOString(),
    seasonYear: getCurrentKoreanSeasonYear(),
    rows,
  };

  kboStandingsCache = {
    expiresAt: Date.now() + STANDINGS_CACHE_TTL_MS,
    result,
  };

  return result;
}

import { isIP } from "net";

type ToolContent = {
  type: "text";
  text: string;
};

export type McpToolResult<TStructuredContent> = {
  content: ToolContent[];
  structuredContent: TStructuredContent;
};

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type NewsArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
};

export type NewsSearchResult = {
  query: string;
  articles: NewsArticle[];
};

export type UrlBriefingResult = {
  url: string;
  title: string;
  description: string;
  excerpt: string;
};

export type KboGameStatus = "scheduled" | "completed" | "draw";

export type KboGame = {
  gameDate: string;
  displayDate: string;
  time: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  status: KboGameStatus;
  stadium: string;
  tv: string;
  note: string;
  gameId: string | null;
  reviewUrl: string | null;
  highlightUrl: string | null;
};

export type KboGamesResult = {
  date: string;
  team: string | null;
  source: string;
  games: KboGame[];
};

export type KboGameRecordBriefingResult = {
  gameId: string | null;
  gameDate: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  status: KboGameStatus;
  stadium: string;
  sourceUrl: string | null;
  sourceType: "review" | "highlight" | "schedule";
  officialSummary: string;
  recordItems: string[];
  officialExcerpt: string;
};

const NEWS_LIMIT = 5;
const MAX_KEYWORD_LENGTH = 80;
const MAX_URL_BYTES = 400_000;
const GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search";
const KBO_BASE_URL = "https://www.koreabaseball.com";
const KBO_SCHEDULE_URL = `${KBO_BASE_URL}/Schedule/Schedule.aspx`;
const KBO_SCHEDULE_LIST_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetScheduleList`;
const KBO_SCOREBOARD_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetScoreBoardScroll`;
const KBO_BOXSCORE_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetBoxScoreScroll`;
const KBO_REGULAR_SEASON_IDS = "0,9,6";
const KBO_TEAM_NAMES = [
  "LG",
  "한화",
  "SSG",
  "삼성",
  "NC",
  "KT",
  "롯데",
  "KIA",
  "두산",
  "키움",
];
const KBO_TEAM_ALIASES: Record<string, string[]> = {
  LG: ["lg", "엘지", "트윈스"],
  한화: ["한화", "이글스"],
  SSG: ["ssg", "랜더스"],
  삼성: ["삼성", "라이온즈"],
  NC: ["nc", "엔씨", "다이노스"],
  KT: ["kt", "케이티", "위즈"],
  롯데: ["롯데", "자이언츠"],
  KIA: ["kia", "기아", "타이거즈"],
  두산: ["두산", "베어스"],
  키움: ["키움", "히어로즈"],
};
const kboScheduleCache = new Map<
  string,
  {
    expiresAt: number;
    result: KboGamesResult;
  }
>();
const KBO_CACHE_TTL_MS = 60_000;

const tools: ToolDefinition[] = [
  {
    name: "search_baseball_news",
    description:
      "Search recent Korean baseball news from an external RSS source by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "야구 뉴스 검색 키워드",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "brief_external_url",
    description:
      "Fetch a public external URL and extract title, description, and readable excerpt.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "분석할 외부 뉴스 또는 참고 URL",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "get_kbo_games",
    description:
      "Fetch official KBO regular-season game schedule and result data by date and optional team.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "조회할 날짜. YYYY-MM-DD 또는 YYYYMMDD 형식",
        },
        team: {
          type: "string",
          description: "선택 팀명. 예: LG, 한화, SSG, KIA",
        },
      },
    },
  },
  {
    name: "brief_kbo_game_record",
    description:
      "Fetch an official KBO game review/highlight page when available and create a boxscore-style record briefing for a game room.",
    inputSchema: {
      type: "object",
      properties: {
        gameId: {
          type: "string",
          description: "KBO gameId when available.",
        },
        gameDate: {
          type: "string",
          description: "경기 날짜. YYYY-MM-DD 형식",
        },
        awayTeam: {
          type: "string",
          description: "원정 팀명",
        },
        homeTeam: {
          type: "string",
          description: "홈 팀명",
        },
        awayScore: {
          type: "number",
          description: "원정 팀 점수",
        },
        homeScore: {
          type: "number",
          description: "홈 팀 점수",
        },
        status: {
          type: "string",
          description: "scheduled, completed, draw 중 하나",
        },
        stadium: {
          type: "string",
          description: "경기장",
        },
        reviewUrl: {
          type: "string",
          description: "KBO 공식 리뷰 URL",
        },
        highlightUrl: {
          type: "string",
          description: "KBO 공식 하이라이트 URL",
        },
      },
      required: ["gameDate", "awayTeam", "homeTeam", "status"],
    },
  },
];

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractXmlTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));

  return match ? decodeXml(stripHtml(match[1])) : "";
}

function parseRssItems(xml: string): NewsArticle[] {
  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)]
    .slice(0, NEWS_LIMIT)
    .map((match) => {
      const item = match[0];
      const title = extractXmlTag(item, "title");
      const url = extractXmlTag(item, "link");
      const source = extractXmlTag(item, "source") || "Google News";
      const publishedAt = extractXmlTag(item, "pubDate") || null;

      return {
        title,
        url,
        source,
        publishedAt,
      };
    })
    .filter((article) => article.title && article.url);
}

function normalizeKeyword(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("keyword must be a string.");
  }

  const keyword = value.trim();

  if (keyword.length < 2 || keyword.length > MAX_KEYWORD_LENGTH) {
    throw new Error(`keyword must be between 2 and ${MAX_KEYWORD_LENGTH} characters.`);
  }

  return keyword;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const ipVersion = isIP(normalized);

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  if (ipVersion === 4) {
    return isPrivateIpv4(normalized);
  }

  if (ipVersion === 6) {
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80")
    );
  }

  return false;
}

function normalizePublicUrl(value: unknown): URL {
  if (typeof value !== "string") {
    throw new Error("url must be a string.");
  }

  const url = new URL(value.trim());

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new Error("Private or local URLs are not allowed.");
  }

  return url;
}

function getKstDateParts(date = new Date()): {
  year: string;
  month: string;
  day: string;
} {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return { year, month, day };
}

function normalizeKboDate(value: unknown): {
  date: string;
  compactDate: string;
  year: string;
  month: string;
} {
  const rawDate =
    typeof value === "string" && value.trim()
      ? value.trim()
      : (() => {
          const today = getKstDateParts();

          return `${today.year}-${today.month}-${today.day}`;
        })();
  const match = rawDate.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);

  if (!match) {
    throw new Error("date must be YYYY-MM-DD or YYYYMMDD.");
  }

  const [, year, month, day] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const maxDay = new Date(yearNumber, monthNumber, 0).getDate();

  if (
    yearNumber < 1982 ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > maxDay
  ) {
    throw new Error("date is invalid.");
  }

  return {
    date: `${year}-${month}-${day}`,
    compactDate: `${year}${month}${day}`,
    year,
    month,
  };
}

function normalizeKboTeam(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("team must be a string.");
  }

  const team = value.trim();
  const normalizedInput = team.toLowerCase().replace(/\s+/g, "");

  if (!team) {
    return null;
  }

  const normalizedTeam = KBO_TEAM_NAMES.find((teamName) =>
    (KBO_TEAM_ALIASES[teamName] ?? []).some((alias) =>
      normalizedInput.includes(alias.toLowerCase()),
    ),
  );

  if (!normalizedTeam) {
    throw new Error(`team must be one of: ${KBO_TEAM_NAMES.join(", ")}.`);
  }

  return normalizedTeam;
}

function getBoundedKboLimit(value: unknown): number {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return 10;
  }

  return Math.min(limit, 30);
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "BaseballAIBoard/0.1 MCP briefing crawler",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`External request failed with status ${response.status}.`);
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (contentLength > MAX_URL_BYTES) {
    throw new Error("External response is too large.");
  }

  const reader = response.body?.getReader();

  if (!reader) {
    return response.text();
  }

  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    receivedBytes += value.byteLength;

    if (receivedBytes > MAX_URL_BYTES) {
      throw new Error("External response is too large.");
    }

    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

function extractMetaContent(html: string, selector: RegExp): string {
  const match = html.match(selector);

  return match ? stripHtml(decodeXml(match[1])) : "";
}

function extractHtmlBrief(url: string, html: string): UrlBriefingResult {
  const title =
    extractMetaContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    extractMetaContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
    url;
  const description =
    extractMetaContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    extractMetaContent(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const bodyText = stripHtml(html).slice(0, 1200);

  return {
    url,
    title,
    description,
    excerpt: bodyText,
  };
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const score = Number(value);

  return Number.isFinite(score) ? score : null;
}

function normalizeKboGameStatus(value: unknown): KboGameStatus {
  if (value === "scheduled" || value === "completed" || value === "draw") {
    return value;
  }

  return "scheduled";
}

function normalizeKboOfficialUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const url = new URL(value.trim(), KBO_BASE_URL);
  const hostname = url.hostname.toLowerCase();

  if (
    hostname !== "koreabaseball.com" &&
    hostname !== "www.koreabaseball.com"
  ) {
    throw new Error("Only official KBO URLs are supported.");
  }

  return url.toString();
}

function normalizeRecordText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/([가-힣])\s+([.,:;])/g, "$1$2")
    .trim();
}

function removeHtmlBlocks(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ");
}

function extractHtmlCandidate(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);

  return match ? match[1] : null;
}

function scoreKboRecordText(text: string): number {
  const recordKeywords = [
    "결승타",
    "홈런",
    "승리투수",
    "패전투수",
    "세이브",
    "홀드",
    "실책",
    "도루",
    "관중",
    "스코어",
    "이닝",
  ];

  return recordKeywords.reduce(
    (score, keyword) => score + (text.includes(keyword) ? 3 : 0),
    Math.min(text.length / 500, 4),
  );
}

const KBO_MENU_MARKERS = [
  "일정・결과",
  "기록・순위",
  "선수 조회",
  "미디어・뉴스",
  "KBO 리그",
  "구단 소개",
  "티켓 안내",
];

function isKboMenuNoise(text: string): boolean {
  return KBO_MENU_MARKERS.filter((marker) => text.includes(marker)).length >= 2;
}

function removeKboMenuNoise(text: string): string {
  if (!isKboMenuNoise(text)) {
    return text;
  }

  const recordMarkers = [
    "결승타",
    "승리투수",
    "패전투수",
    "홈런",
    "2루타",
    "3루타",
    "실책",
    "도루",
  ];
  const firstRecordIndex = recordMarkers
    .map((marker) => text.indexOf(marker))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (firstRecordIndex === undefined) {
    return "";
  }

  return text.slice(Math.max(0, firstRecordIndex - 120));
}

function extractKboOfficialRecordText(html: string): string {
  const cleanedHtml = removeHtmlBlocks(html);
  const candidates = [
    extractHtmlCandidate(
      cleanedHtml,
      /<div[^>]+id=["']contents["'][^>]*>([\s\S]*?)<footer/i,
    ),
    extractHtmlCandidate(
      cleanedHtml,
      /<section[^>]+id=["']contents["'][^>]*>([\s\S]*?)<\/section>/i,
    ),
    extractHtmlCandidate(
      cleanedHtml,
      /<div[^>]+class=["'][^"']*(?:game|record|score|boxscore|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ),
    cleanedHtml,
  ]
    .filter((candidate): candidate is string => Boolean(candidate))
    .map((candidate) => normalizeRecordText(stripHtml(candidate)))
    .map(removeKboMenuNoise)
    .filter(Boolean);

  const bestCandidate = candidates
    .map((text) => ({
      text,
      score: scoreKboRecordText(text),
    }))
    .sort((left, right) => right.score - left.score)[0]?.text;

  return bestCandidate ?? "";
}

function getScoreSummary(input: {
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  status: KboGameStatus;
  stadium: string;
}): string {
  const statusLabel =
    input.status === "scheduled"
      ? "경기 전"
      : input.status === "draw"
        ? "무승부"
        : "경기 종료";
  const scoreText =
    input.awayScore === null || input.homeScore === null
      ? "스코어 미정"
      : `${input.awayTeam} ${input.awayScore} : ${input.homeScore} ${input.homeTeam}`;
  const stadium = input.stadium ? `, ${input.stadium}` : "";

  return `${scoreText} (${statusLabel}${stadium})`;
}

function findKeywordSnippet(text: string, keyword: string): string | null {
  const index = text.indexOf(keyword);

  if (index < 0) {
    return null;
  }

  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + 160);
  const snippet = normalizeRecordText(text.slice(start, end));

  if (snippet.length < keyword.length || isKboMenuNoise(snippet)) {
    return null;
  }

  return snippet.length > 220 ? `${snippet.slice(0, 220)}...` : snippet;
}

function extractRecordItems(text: string): string[] {
  const keywords = [
    "결승타",
    "홈런",
    "2루타",
    "3루타",
    "실책",
    "도루",
    "병살",
    "폭투",
    "승리투수",
    "패전투수",
    "세이브",
    "홀드",
    "관중",
    "시간",
  ];
  const items: string[] = [];
  const seen = new Set<string>();

  for (const keyword of keywords) {
    const snippet = findKeywordSnippet(text, keyword);
    const key = snippet?.toLowerCase();

    if (snippet && key && !seen.has(key)) {
      items.push(snippet);
      seen.add(key);
    }

    if (items.length >= 6) {
      break;
    }
  }

  return items;
}

type KboScheduleCell = {
  Text?: string | null;
  Class?: string | null;
};

type KboScheduleRow = {
  row?: KboScheduleCell[];
};

type KboScheduleResponse = {
  rows?: KboScheduleRow[];
};

type KboGridTable = {
  headers?: KboScheduleRow[];
  rows?: KboScheduleRow[];
  tfoot?: KboScheduleRow[];
};

type KboScoreBoardResponse = {
  code?: string;
  msg?: string;
  S_NM?: string;
  CROWD_CN?: string;
  START_TM?: string;
  END_TM?: string;
  USE_TM?: string;
  table2?: string;
  table3?: string;
  T_SCORE_CN?: number | string;
  B_SCORE_CN?: number | string;
};

type KboBoxScoreResponse = {
  code?: string;
  msg?: string;
  tableEtc?: string;
  arrPitcher?: {
    table?: string;
  }[];
};

type KboOfficialRecordData = {
  recordItems: string[];
  officialExcerpt: string;
};

function getCellText(cell: KboScheduleCell | undefined): string {
  return stripHtml(decodeXml(cell?.Text ?? ""));
}

function normalizeKboTableText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return normalizeRecordText(
    stripHtml(decodeXml(String(value).replace(/&nbsp;/gi, " "))),
  );
}

function parseKboGridTable(value: unknown): KboGridTable | null {
  if (typeof value === "string" && value.trim()) {
    try {
      return JSON.parse(value) as KboGridTable;
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && value !== null) {
    return value as KboGridTable;
  }

  return null;
}

function getKboGridRows(value: unknown): string[][] {
  const table = parseKboGridTable(value);

  return (table?.rows ?? [])
    .map((row) =>
      (row.row ?? []).map((cell) => normalizeKboTableText(cell.Text)),
    )
    .filter((row) => row.some(Boolean));
}

function getKboGridHeader(value: unknown): string[] {
  const table = parseKboGridTable(value);
  const headerRow = table?.headers?.[0]?.row ?? [];

  return headerRow.map((cell) => normalizeKboTableText(cell.Text));
}

function getKboTableColumn(
  row: string[],
  header: string[],
  columnName: string,
): string {
  const index = header.indexOf(columnName);

  return index >= 0 ? row[index] ?? "" : "";
}

function getKboSeriesIdFromGameId(gameId: string): string {
  return gameId.match(/\d$/)?.[0] ?? "0";
}

function formatKboTotalLine(team: string, row: string[] | undefined): string | null {
  if (!row || row.length < 4) {
    return null;
  }

  const [runs, hits, errors, basesOnBalls] = row;

  return `${team} ${runs}득점 ${hits}안타 ${errors}실책 ${basesOnBalls}B`;
}

function formatKboScoringInnings(
  team: string,
  inningHeader: string[],
  inningScores: string[] | undefined,
): string | null {
  if (!inningScores) {
    return null;
  }

  const scoringInnings = inningScores
    .map((score, index) => ({
      inning: inningHeader[index] ?? `${index + 1}`,
      score: Number(score),
    }))
    .filter((inning) => Number.isFinite(inning.score) && inning.score > 0)
    .map((inning) => `${inning.inning}회 ${inning.score}점`);

  if (scoringInnings.length === 0) {
    return `${team}: 득점 이닝 없음`;
  }

  return `${team}: ${scoringInnings.join(", ")}`;
}

function extractKboEtcItems(boxScore: KboBoxScoreResponse | null): string[] {
  return getKboGridRows(boxScore?.tableEtc)
    .map(([label, value]) => {
      if (!label || !value) {
        return null;
      }

      return `${label}: ${value}`;
    })
    .filter((item): item is string => Boolean(item));
}

function formatKboPitcherLine(
  team: string,
  header: string[],
  row: string[],
): string | null {
  const name = getKboTableColumn(row, header, "선수명");
  const role = getKboTableColumn(row, header, "등판");
  const result = getKboTableColumn(row, header, "결과");
  const inning = getKboTableColumn(row, header, "이닝");
  const hits = getKboTableColumn(row, header, "피안타");
  const strikeouts = getKboTableColumn(row, header, "삼진");
  const runs = getKboTableColumn(row, header, "실점");
  const earnedRuns = getKboTableColumn(row, header, "자책");
  const marker = result || (role === "선발" ? "선발" : "");

  if (!name || !marker) {
    return null;
  }

  return `${team} ${name} ${marker}: ${inning}이닝 ${hits}피안타 ${runs}실점 ${earnedRuns}자책 ${strikeouts}K`;
}

function extractKboPitcherItems(
  boxScore: KboBoxScoreResponse | null,
  awayTeam: string,
  homeTeam: string,
): string | null {
  const teams = [awayTeam, homeTeam];
  const pitcherLines = (boxScore?.arrPitcher ?? [])
    .flatMap((pitcher, index) => {
      const header = getKboGridHeader(pitcher.table);
      const rows = getKboGridRows(pitcher.table);
      const team = teams[index] ?? "";

      return rows
        .map((row) => formatKboPitcherLine(team, header, row))
        .filter((item): item is string => Boolean(item));
    })
    .slice(0, 5);

  return pitcherLines.length > 0
    ? `주요 투수 기록: ${pitcherLines.join(" / ")}`
    : null;
}

function buildKboOfficialRecordData(input: {
  scoreBoard: KboScoreBoardResponse | null;
  boxScore: KboBoxScoreResponse | null;
  awayTeam: string;
  homeTeam: string;
}): KboOfficialRecordData | null {
  const scoreRows = getKboGridRows(input.scoreBoard?.table2);
  const scoreHeader = getKboGridHeader(input.scoreBoard?.table2);
  const totalRows = getKboGridRows(input.scoreBoard?.table3);
  const totalLine = [
    formatKboTotalLine(input.awayTeam, totalRows[0]),
    formatKboTotalLine(input.homeTeam, totalRows[1]),
  ].filter(Boolean);
  const scoringLine = [
    formatKboScoringInnings(input.awayTeam, scoreHeader, scoreRows[0]),
    formatKboScoringInnings(input.homeTeam, scoreHeader, scoreRows[1]),
  ].filter(Boolean);
  const gameInfo = [
    input.scoreBoard?.S_NM ? `구장 ${input.scoreBoard.S_NM}` : "",
    input.scoreBoard?.CROWD_CN ? `관중 ${input.scoreBoard.CROWD_CN}명` : "",
    input.scoreBoard?.START_TM ? `개시 ${input.scoreBoard.START_TM}` : "",
    input.scoreBoard?.END_TM ? `종료 ${input.scoreBoard.END_TM}` : "",
    input.scoreBoard?.USE_TM ? `경기시간 ${input.scoreBoard.USE_TM}` : "",
  ].filter(Boolean);
  const recordItems = [
    totalLine.length > 0 ? `스코어보드: ${totalLine.join(", ")}` : null,
    scoringLine.length > 0 ? `득점 이닝: ${scoringLine.join(" / ")}` : null,
    ...extractKboEtcItems(input.boxScore),
    extractKboPitcherItems(input.boxScore, input.awayTeam, input.homeTeam),
    gameInfo.length > 0 ? `경기 정보: ${gameInfo.join(", ")}` : null,
  ].filter((item): item is string => Boolean(item));
  const uniqueItems = [...new Set(recordItems)].slice(0, 12);

  if (uniqueItems.length === 0) {
    return null;
  }

  return {
    recordItems: uniqueItems,
    officialExcerpt: uniqueItems.join("\n"),
  };
}

async function fetchKboOfficialJson<T>(
  url: string,
  params: Record<string, string>,
  referer: string,
): Promise<T> {
  const text = await fetchText(url, {
    method: "POST",
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: referer,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams(params),
  });

  return JSON.parse(text) as T;
}

async function fetchKboOfficialRecordData(input: {
  gameId: string | null;
  gameDate: string;
  awayTeam: string;
  homeTeam: string;
  sourceUrl: string | null;
}): Promise<KboOfficialRecordData | null> {
  if (!input.gameId) {
    return null;
  }

  const compactDate = input.gameDate.replace(/-/g, "");
  const params = {
    leId: "1",
    srId: getKboSeriesIdFromGameId(input.gameId),
    seasonId: input.gameDate.slice(0, 4),
    gameId: input.gameId,
  };
  const referer =
    input.sourceUrl ??
    `${KBO_BASE_URL}/Schedule/GameCenter/Main.aspx?gameDate=${compactDate}&gameId=${input.gameId}&section=REVIEW`;
  const [scoreBoardResult, boxScoreResult] = await Promise.allSettled([
    fetchKboOfficialJson<KboScoreBoardResponse>(
      KBO_SCOREBOARD_URL,
      params,
      referer,
    ),
    fetchKboOfficialJson<KboBoxScoreResponse>(
      KBO_BOXSCORE_URL,
      params,
      referer,
    ),
  ]);
  const scoreBoard =
    scoreBoardResult.status === "fulfilled" ? scoreBoardResult.value : null;
  const boxScore =
    boxScoreResult.status === "fulfilled" ? boxScoreResult.value : null;

  return buildKboOfficialRecordData({
    scoreBoard,
    boxScore,
    awayTeam: input.awayTeam,
    homeTeam: input.homeTeam,
  });
}

function extractKboLink(html: string): string | null {
  const match = html.match(/href=["']([^"']+)["']/i);

  if (!match) {
    return null;
  }

  return new URL(decodeXml(match[1]), KBO_BASE_URL).toString();
}

function extractKboGameId(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).searchParams.get("gameId");
  } catch {
    return null;
  }
}

function parseKboDisplayDate(displayDate: string, seasonId: string): string | null {
  const match = displayDate.match(/^(\d{2})\.(\d{2})/);

  if (!match) {
    return null;
  }

  return `${seasonId}-${match[1]}-${match[2]}`;
}

function parseKboPlayCell(playHtml: string): {
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  status: KboGameStatus;
} | null {
  const match = playHtml.match(
    /<span[^>]*>([^<]+)<\/span>\s*<em>([\s\S]*?)<\/em>\s*<span[^>]*>([^<]+)<\/span>/i,
  );

  if (!match) {
    return null;
  }

  const [, awayTeamRaw, scoreHtml, homeTeamRaw] = match;
  const scoreParts = [...scoreHtml.matchAll(/<span[^>]*>([^<]+)<\/span>/gi)]
    .map((scoreMatch) => stripHtml(decodeXml(scoreMatch[1])))
    .filter((part) => /^\d+$/.test(part));
  const awayScore = scoreParts[0] ? Number(scoreParts[0]) : null;
  const homeScore = scoreParts[1] ? Number(scoreParts[1]) : null;
  const status =
    awayScore === null || homeScore === null
      ? "scheduled"
      : awayScore === homeScore
        ? "draw"
        : "completed";

  return {
    awayTeam: stripHtml(decodeXml(awayTeamRaw)),
    homeTeam: stripHtml(decodeXml(homeTeamRaw)),
    awayScore,
    homeScore,
    status,
  };
}

function parseKboScheduleRows(
  rows: KboScheduleRow[],
  seasonId: string,
): KboGame[] {
  const games: KboGame[] = [];
  let currentDisplayDate = "";
  let currentGameDate = "";

  for (const item of rows) {
    const cells = item.row ?? [];

    if (cells.length < 2) {
      continue;
    }

    let offset = 0;

    if (cells[0]?.Class === "day") {
      currentDisplayDate = getCellText(cells[0]);
      currentGameDate =
        parseKboDisplayDate(currentDisplayDate, seasonId) ?? currentGameDate;
      offset = 1;
    }

    const time = getCellText(cells[offset]);
    const playHtml = cells[offset + 1]?.Text ?? "";
    const play = parseKboPlayCell(playHtml);

    if (!currentGameDate || !time || !play) {
      continue;
    }

    const reviewUrl = extractKboLink(cells[offset + 2]?.Text ?? "");
    const highlightUrl = extractKboLink(cells[offset + 3]?.Text ?? "");
    const isPregameScore =
      play.awayScore === 0 &&
      play.homeScore === 0 &&
      reviewUrl === null &&
      highlightUrl === null;

    games.push({
      gameDate: currentGameDate,
      displayDate: currentDisplayDate,
      time,
      awayTeam: play.awayTeam,
      homeTeam: play.homeTeam,
      awayScore: isPregameScore ? null : play.awayScore,
      homeScore: isPregameScore ? null : play.homeScore,
      status: isPregameScore ? "scheduled" : play.status,
      stadium: getCellText(cells[offset + 6]),
      tv: getCellText(cells[offset + 4]),
      note: getCellText(cells[offset + 7]),
      gameId: extractKboGameId(reviewUrl ?? highlightUrl),
      reviewUrl,
      highlightUrl,
    });
  }

  return games;
}

async function fetchKboMonthlyGames(
  seasonId: string,
  gameMonth: string,
): Promise<KboGame[]> {
  const body = new URLSearchParams({
    leId: "1",
    srIdList: KBO_REGULAR_SEASON_IDS,
    seasonId,
    gameMonth,
    teamId: "",
  });
  const text = await fetchText(KBO_SCHEDULE_LIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: KBO_SCHEDULE_URL,
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
  });
  const data = JSON.parse(text) as KboScheduleResponse;

  return parseKboScheduleRows(data.rows ?? [], seasonId);
}

function formatKboGame(game: KboGame): string {
  const score =
    game.awayScore === null || game.homeScore === null
      ? "경기 전"
      : `${game.awayScore} : ${game.homeScore}`;
  const status =
    game.status === "scheduled"
      ? "예정"
      : game.status === "draw"
        ? "무승부"
        : "종료";
  const stadium = game.stadium ? ` / ${game.stadium}` : "";

  return `${game.time} ${game.awayTeam} vs ${game.homeTeam} (${score}, ${status}${stadium})`;
}

function formatKboGamesText(result: KboGamesResult): string {
  return result.games.length > 0
    ? result.games.map(formatKboGame).join("\n")
    : `${result.date} 기준 KBO 공식 경기 일정/결과가 없습니다.`;
}

export function listBaseballBriefingTools(): ToolDefinition[] {
  return tools;
}

export async function searchBaseballNews(
  args: Record<string, unknown>,
): Promise<McpToolResult<NewsSearchResult>> {
  const keyword = normalizeKeyword(args.keyword);
  const rssUrl = new URL(GOOGLE_NEWS_RSS_URL);

  rssUrl.searchParams.set("q", `${keyword} 야구 OR KBO`);
  rssUrl.searchParams.set("hl", "ko");
  rssUrl.searchParams.set("gl", "KR");
  rssUrl.searchParams.set("ceid", "KR:ko");

  const xml = await fetchText(rssUrl.toString());
  const articles = parseRssItems(xml);
  const text =
    articles.length > 0
      ? articles
          .map(
            (article, index) =>
              `${index + 1}. ${article.title} (${article.source})\n${article.url}`,
          )
          .join("\n")
      : "검색된 야구 뉴스가 없습니다.";

  return {
    content: [{ type: "text", text }],
    structuredContent: {
      query: keyword,
      articles,
    },
  };
}

export async function briefExternalUrl(
  args: Record<string, unknown>,
): Promise<McpToolResult<UrlBriefingResult>> {
  const url = normalizePublicUrl(args.url);
  const html = await fetchText(url.toString());
  const result = extractHtmlBrief(url.toString(), html);

  return {
    content: [
      {
        type: "text",
        text: [result.title, result.description, result.excerpt]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    structuredContent: result,
  };
}

export async function getKboGames(
  args: Record<string, unknown>,
): Promise<McpToolResult<KboGamesResult>> {
  const targetDate = normalizeKboDate(args.date);
  const team = normalizeKboTeam(args.team);
  const limit = getBoundedKboLimit(args.limit);
  const cacheKey = `${targetDate.date}:${team ?? "all"}:${limit}`;
  const cached = kboScheduleCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return {
      content: [
        {
          type: "text",
          text: formatKboGamesText(cached.result),
        },
      ],
      structuredContent: cached.result,
    };
  }

  const monthlyGames = await fetchKboMonthlyGames(
    targetDate.year,
    targetDate.month,
  );
  const games = monthlyGames
    .filter((game) => game.gameDate === targetDate.date)
    .filter(
      (game) =>
        !team || game.awayTeam.toLowerCase() === team.toLowerCase() || game.homeTeam.toLowerCase() === team.toLowerCase(),
    )
    .slice(0, limit);
  const source = `${KBO_SCHEDULE_URL}?seriesId=${encodeURIComponent(
    KBO_REGULAR_SEASON_IDS,
  )}&gamedate=${targetDate.compactDate}`;
  const result: KboGamesResult = {
    date: targetDate.date,
    team,
    source,
    games,
  };

  kboScheduleCache.set(cacheKey, {
    expiresAt: Date.now() + KBO_CACHE_TTL_MS,
    result,
  });

  return {
    content: [{ type: "text", text: formatKboGamesText(result) }],
    structuredContent: result,
  };
}

export async function briefKboGameRecord(
  args: Record<string, unknown>,
): Promise<McpToolResult<KboGameRecordBriefingResult>> {
  const gameDate = normalizeKboDate(args.gameDate).date;
  const awayTeam = normalizeOptionalString(args.awayTeam);
  const homeTeam = normalizeOptionalString(args.homeTeam);
  const awayScore = normalizeNullableScore(args.awayScore);
  const homeScore = normalizeNullableScore(args.homeScore);
  const status = normalizeKboGameStatus(args.status);
  const stadium = normalizeOptionalString(args.stadium);
  const gameId = normalizeOptionalString(args.gameId) || null;
  const reviewUrl = normalizeKboOfficialUrl(args.reviewUrl);
  const highlightUrl = normalizeKboOfficialUrl(args.highlightUrl);
  const sourceUrl = reviewUrl ?? highlightUrl;
  const sourceType = reviewUrl ? "review" : highlightUrl ? "highlight" : "schedule";
  const scoreSummary = getScoreSummary({
    awayTeam,
    homeTeam,
    awayScore,
    homeScore,
    status,
    stadium,
  });

  if (!awayTeam || !homeTeam) {
    throw new Error("awayTeam and homeTeam are required.");
  }

  const officialRecordData = await fetchKboOfficialRecordData({
    gameId,
    gameDate,
    awayTeam,
    homeTeam,
    sourceUrl,
  }).catch(() => null);

  if (officialRecordData) {
    const { recordItems, officialExcerpt } = officialRecordData;
    const officialSummary = [
      `${gameDate} ${awayTeam} vs ${homeTeam} 공식 기록 브리핑입니다.`,
      scoreSummary,
      `KBO 공식 스코어보드/박스스코어에서 ${recordItems.length}개의 기록 포인트를 확인했습니다.`,
    ].join(" ");
    const text = [
      officialSummary,
      recordItems.map((item, index) => `${index + 1}. ${item}`).join("\n"),
      sourceUrl,
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        gameId,
        gameDate,
        awayTeam,
        homeTeam,
        awayScore,
        homeScore,
        status,
        stadium,
        sourceUrl,
        sourceType,
        officialSummary,
        recordItems,
        officialExcerpt,
      },
    };
  }

  if (!sourceUrl) {
    const officialSummary =
      status === "scheduled"
        ? `${gameDate} ${awayTeam} vs ${homeTeam} 경기는 아직 KBO 공식 리뷰가 제공되지 않았습니다. 현재 확인 가능한 공식 정보는 일정과 경기장 정보입니다.`
        : `${gameDate} ${awayTeam} vs ${homeTeam} 경기의 KBO 공식 리뷰 URL을 찾지 못했습니다. 현재는 일정/스코어 정보만 확인할 수 있습니다.`;

    return {
      content: [
        {
          type: "text",
          text: `${scoreSummary}\n${officialSummary}`,
        },
      ],
      structuredContent: {
        gameId,
        gameDate,
        awayTeam,
        homeTeam,
        awayScore,
        homeScore,
        status,
        stadium,
        sourceUrl: null,
        sourceType: "schedule",
        officialSummary,
        recordItems: [],
        officialExcerpt: "",
      },
    };
  }

  const html = await fetchText(sourceUrl, {
    headers: {
      Referer: KBO_SCHEDULE_URL,
    },
  });
  const pageTitle =
    extractMetaContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    extractMetaContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageDescription =
    extractMetaContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    extractMetaContent(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const officialText = normalizeRecordText(
    [pageTitle, pageDescription, extractKboOfficialRecordText(html)]
      .filter(Boolean)
      .join(" "),
  );
  const recordItems = extractRecordItems(officialText);
  const officialSummary = [
    `${gameDate} ${awayTeam} vs ${homeTeam} 공식 기록 브리핑입니다.`,
    scoreSummary,
    recordItems.length > 0
      ? `공식 페이지에서 ${recordItems.length}개의 기록 포인트를 추출했습니다.`
      : "공식 페이지는 확인했지만 메뉴를 제외한 상세 기록 문장을 충분히 추출하지 못했습니다. 원문에서 세부 기록을 확인해주세요.",
  ].join(" ");
  const officialExcerpt = recordItems.length > 0 ? officialText.slice(0, 900) : "";
  const text = [
    officialSummary,
    recordItems.length > 0
      ? recordItems.map((item, index) => `${index + 1}. ${item}`).join("\n")
      : officialExcerpt,
    sourceUrl,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    content: [{ type: "text", text }],
    structuredContent: {
      gameId,
      gameDate,
      awayTeam,
      homeTeam,
      awayScore,
      homeScore,
      status,
      stadium,
      sourceUrl,
      sourceType,
      officialSummary,
      recordItems,
      officialExcerpt,
    },
  };
}

export async function callBaseballBriefingTool(
  name: string,
  args: Record<string, unknown>,
) {
  if (name === "search_baseball_news") {
    return searchBaseballNews(args);
  }

  if (name === "brief_external_url") {
    return briefExternalUrl(args);
  }

  if (name === "get_kbo_games") {
    return getKboGames(args);
  }

  if (name === "brief_kbo_game_record") {
    return briefKboGameRecord(args);
  }

  throw new Error(`Unknown MCP tool: ${name}`);
}

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

const NEWS_LIMIT = 5;
const MAX_KEYWORD_LENGTH = 80;
const MAX_URL_BYTES = 400_000;
const GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search";
const KBO_BASE_URL = "https://www.koreabaseball.com";
const KBO_SCHEDULE_URL = `${KBO_BASE_URL}/Schedule/Schedule.aspx`;
const KBO_SCHEDULE_LIST_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetScheduleList`;
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

function getCellText(cell: KboScheduleCell | undefined): string {
  return stripHtml(decodeXml(cell?.Text ?? ""));
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

  throw new Error(`Unknown MCP tool: ${name}`);
}

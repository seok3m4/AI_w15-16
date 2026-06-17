import { ChatOpenAI } from "@langchain/openai";
import type { Prisma } from "@prisma/client";

import { getChatModel, getOpenAIApiKey } from "@/lib/ai/config";
import {
  fetchPlayerRecords,
  type PlayerRecord,
} from "@/lib/kbo/player-records";
import { fetchKboStandings } from "@/lib/kbo/standings";
import type {
  KboGamesResult,
  McpToolResult,
  NewsSearchResult,
  UrlBriefingResult,
} from "@/lib/mcp/baseball-briefing-tools";
import { invokeBaseballMcpTool } from "@/lib/mcp/json-rpc";
import { getPostPreviewText } from "@/lib/posts/content";
import { prisma } from "@/lib/prisma";

export type BoardAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type BoardAssistantStep = {
  toolName: string;
  status: "success" | "error" | "skipped";
  summary: string;
};

export type BoardAssistantSource = {
  title: string;
  url: string;
  source?: string;
};

export type BoardAssistantResult = {
  answer: string;
  steps: BoardAssistantStep[];
  sources: BoardAssistantSource[];
};

type BoardPostContext = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  viewCount: number;
  commentCount: number;
  tags: string[];
  url: string;
};

type GameRoomContext = {
  date: string;
  source: string;
  rooms: {
    title: string;
    status: string;
    score: string;
    stadium: string;
    startingPitchers: string;
    decisionPitchers: string;
    url: string;
  }[];
};

type PlayerRecordLeader = {
  label: string;
  rows: {
    ranking: number;
    playerName: string;
    teamName: string;
    value: string;
  }[];
};

type PlayerRecordsMemory = {
  season: string;
  source: string;
  hitters: PlayerRecordLeader[];
  pitchers: PlayerRecordLeader[];
};

type PlayerRecordMatch = {
  type: "hitter" | "pitcher";
  season: string;
  playerName: string;
  teamName: string;
  position: string;
  stats: string[];
  source: string;
};

type PlayerRecordSearchMemory = {
  candidates: string[];
  matches: PlayerRecordMatch[];
  source: string;
};

type AssistantMemory = {
  posts: BoardPostContext[];
  hotPosts: BoardPostContext[];
  recentPosts: BoardPostContext[];
  games: KboGamesResult | null;
  gameRooms: GameRoomContext | null;
  news: NewsSearchResult | null;
  urlBriefing: UrlBriefingResult | null;
  playerRecords: PlayerRecordsMemory | null;
  playerSearch: PlayerRecordSearchMemory | null;
  standings:
    | {
        seasonYear: number;
        rows: {
          rank: number;
          team: string;
          wins: number;
          losses: number;
          draws: number;
          winningRate: string;
          gamesBehind: string;
        }[];
      }
    | null;
};

const MAX_QUESTION_LENGTH = 500;
const TEAM_KEYWORDS = [
  "LG",
  "한화",
  "SSG",
  "삼성",
  "NC",
  "KT",
  "롯데",
  "KIA",
  "기아",
  "두산",
  "키움",
];
const STOP_WORDS = new Set([
  "오늘",
  "어제",
  "내일",
  "경기",
  "결과",
  "일정",
  "관련",
  "게시글",
  "글",
  "뉴스",
  "기사",
  "선수",
  "선수의",
  "시즌",
  "기록",
  "현재",
  "요약",
  "알려줘",
  "보여줘",
  "정리해줘",
  "어때",
  "뭐야",
  "누구야",
]);
const PLAYER_NAME_STOP_WORDS = new Set([
  ...STOP_WORDS,
  "타율",
  "홈런",
  "타점",
  "득점",
  "도루",
  "안타",
  "OPS",
  "ops",
  "WAR",
  "war",
  "ERA",
  "era",
  "WHIP",
  "whip",
  "승",
  "패",
  "세이브",
  "홀드",
  "탈삼진",
  "순위",
  "리더",
  "랭킹",
  "1위",
  "1등",
  "상위",
  "기록실",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (isRecord(part) && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("")
    .trim();
}

function getMcpResult<TStructuredContent>(
  value: unknown,
): McpToolResult<TStructuredContent> {
  if (!isRecord(value) || !("structuredContent" in value)) {
    throw new Error("MCP response is invalid.");
  }

  return value as McpToolResult<TStructuredContent>;
}

function getKstDate(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function normalizeDateParts(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractDate(question: string): string | undefined {
  const exactMatch = question.match(
    /(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/,
  );

  if (exactMatch) {
    return normalizeDateParts(exactMatch[1], exactMatch[2], exactMatch[3]);
  }

  const monthDayMatch = question.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);

  if (monthDayMatch) {
    const year = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).format(new Date());

    return normalizeDateParts(year, monthDayMatch[1], monthDayMatch[2]);
  }

  if (question.includes("오늘")) {
    return getKstDate();
  }

  return undefined;
}

function extractUrl(question: string): string | null {
  const match = question.match(/https?:\/\/[^\s]+/i);

  return match ? match[0] : null;
}

function extractTeam(question: string, selectedTeam?: string): string {
  const selected = selectedTeam?.trim();

  if (selected) {
    return selected;
  }

  const normalizedQuestion = question.toLowerCase();

  return (
    TEAM_KEYWORDS.find((team) =>
      normalizedQuestion.includes(team.toLowerCase()),
    ) ?? ""
  );
}

function hasAnyKeyword(question: string, keywords: string[]): boolean {
  return keywords.some((keyword) => question.includes(keyword));
}

function extractSearchTokens(question: string, selectedTeam?: string): string[] {
  const team = extractTeam(question, selectedTeam);
  const tokens = question
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !STOP_WORDS.has(token));

  return [...new Set([team, ...tokens].filter(Boolean))].slice(0, 5);
}

function normalizePlayerNameCandidate(token: string): string {
  return token
    .trim()
    .replace(/선수$/u, "")
    .replace(/선수의$/u, "")
    .replace(/(의|은|는|이|가|을|를|과|와|도|만)$/u, "")
    .trim();
}

function extractPlayerNameCandidates(question: string): string[] {
  const explicitPlayerNames = [...question.matchAll(/([가-힣A-Za-z0-9]{2,12})\s*선수/gu)]
    .map((match) => normalizePlayerNameCandidate(match[1]))
    .filter((token) => token.length >= 2);
  const tokens = question
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map(normalizePlayerNameCandidate)
    .filter((token) => token.length >= 2)
    .filter((token) => !PLAYER_NAME_STOP_WORDS.has(token))
    .filter(
      (token) =>
        !TEAM_KEYWORDS.some(
          (team) => team.toLowerCase() === token.toLowerCase(),
        ),
    );

  return [...new Set([...explicitPlayerNames, ...tokens])].slice(0, 4);
}

function getExcerpt(content: string): string {
  const normalized = getPostPreviewText(content, 140);

  return normalized.length > 140
    ? `${normalized.slice(0, 140)}...`
    : normalized;
}

const boardPostSelect = {
  id: true,
  title: true,
  content: true,
  viewCount: true,
  author: {
    select: {
      nickname: true,
    },
  },
  tags: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      tag: {
        select: {
          name: true,
        },
      },
    },
  },
  _count: {
    select: {
      comments: true,
    },
  },
} satisfies Prisma.PostSelect;

type BoardPostRow = Prisma.PostGetPayload<{
  select: typeof boardPostSelect;
}>;

function toBoardPostContext(post: BoardPostRow): BoardPostContext {
  return {
    id: post.id,
    title: post.title,
    excerpt: getExcerpt(post.content),
    author: post.author.nickname,
    viewCount: post.viewCount,
    commentCount: post._count.comments,
    tags: post.tags.map(({ tag }) => tag.name),
    url: `/posts/${post.id}`,
  };
}

async function findBoardPosts(input: {
  where?: Prisma.PostWhereInput;
  orderBy: Prisma.PostOrderByWithRelationInput[];
  take: number;
}): Promise<BoardPostContext[]> {
  const posts = await prisma.post.findMany({
    where: input.where,
    orderBy: input.orderBy,
    take: input.take,
    select: boardPostSelect,
  });

  return posts.map(toBoardPostContext);
}

function mergeSources(
  currentSources: BoardAssistantSource[],
  nextSources: BoardAssistantSource[],
): BoardAssistantSource[] {
  const sourceMap = new Map<string, BoardAssistantSource>();

  for (const source of [...currentSources, ...nextSources]) {
    sourceMap.set(source.url, source);
  }

  return [...sourceMap.values()].slice(0, 8);
}

async function searchBoardPosts(input: {
  question: string;
  selectedTeam?: string;
}): Promise<BoardPostContext[]> {
  const tokens = extractSearchTokens(input.question, input.selectedTeam);
  const conditions: Prisma.PostWhereInput[] = [];

  for (const token of tokens) {
    conditions.push(
      {
        title: {
          contains: token,
          mode: "insensitive",
        },
      },
      {
        content: {
          contains: token,
          mode: "insensitive",
        },
      },
      {
        tags: {
          some: {
            tag: {
              name: {
                equals: token,
                mode: "insensitive",
              },
            },
          },
        },
      },
    );
  }

  return findBoardPosts({
    where: conditions.length > 0 ? { OR: conditions } : {},
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: 8,
  });
}

async function fetchHotBoardPosts(): Promise<BoardPostContext[]> {
  return findBoardPosts({
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: 6,
  });
}

async function fetchRecentBoardPosts(): Promise<BoardPostContext[]> {
  return findBoardPosts({
    orderBy: [{ createdAt: "desc" }],
    take: 6,
  });
}

function getGameRoomUrl(game: KboGamesResult["games"][number]): string {
  const gameKey =
    game.gameId ??
    `${game.gameDate}-${game.awayTeam}-${game.homeTeam}`
      .replace(/\s+/g, "-")
      .toLowerCase();
  const params = new URLSearchParams({
    date: game.gameDate,
  });

  return `/games/${encodeURIComponent(gameKey)}?${params.toString()}`;
}

function buildGameRoomContext(result: KboGamesResult): GameRoomContext {
  return {
    date: result.date,
    source: result.source,
    rooms: result.games.map((game) => ({
      title: `${game.gameDate} ${game.awayTeam} vs ${game.homeTeam}`,
      status: game.status,
      score:
        game.awayScore === null || game.homeScore === null
          ? "경기 전"
          : `${game.awayScore}:${game.homeScore}`,
      stadium: game.stadium,
      startingPitchers:
        game.awayStartingPitcher || game.homeStartingPitcher
          ? `${game.awayTeam} ${game.awayStartingPitcher?.name ?? "미정"} vs ${
              game.homeTeam
            } ${game.homeStartingPitcher?.name ?? "미정"}`
          : "",
      decisionPitchers:
        game.winningPitcher || game.losingPitcher || game.savePitcher
          ? `승 ${game.winningPitcher?.name ?? "-"} / 패 ${
              game.losingPitcher?.name ?? "-"
            } / 세 ${game.savePitcher?.name ?? "-"}`
          : "",
      url: getGameRoomUrl(game),
    })),
  };
}

function formatRate(value: number): string {
  return value.toFixed(3).replace(/^0/, "");
}

function formatRecordValue(value: number, digits = 0): string {
  return digits > 0 ? value.toFixed(digits) : String(value);
}

function buildLeaderRows(
  records: PlayerRecord[],
  getValue: (record: PlayerRecord) => number | null | undefined,
  formatValue: (value: number) => string,
): PlayerRecordLeader["rows"] {
  return records
    .map((record) => ({
      record,
      value: getValue(record),
    }))
    .filter(
      (item): item is { record: PlayerRecord; value: number } =>
        typeof item.value === "number" && Number.isFinite(item.value),
    )
    .slice(0, 5)
    .map((item) => ({
      ranking: item.record.ranking,
      playerName: item.record.playerName,
      teamName: item.record.teamName,
      value: formatValue(item.value),
    }));
}

type PlayerRecordLeaderConfig = {
  type: "hitter" | "pitcher";
  sortField: string;
  label: string;
  getValue: (record: PlayerRecord) => number | null | undefined;
  formatValue: (value: number) => string;
};

async function fetchPlayerRecordLeader(
  config: PlayerRecordLeaderConfig,
): Promise<{
  leader: PlayerRecordLeader;
  result: Awaited<ReturnType<typeof fetchPlayerRecords>>;
}> {
  const result = await fetchPlayerRecords({
    type: config.type,
    sortField: config.sortField,
    pageSize: 10,
  });

  return {
    result,
    leader: {
      label: config.label,
      rows: buildLeaderRows(result.records, config.getValue, config.formatValue),
    },
  };
}

async function fetchPlayerRecordsMemory(): Promise<PlayerRecordsMemory> {
  const hitterConfigs: PlayerRecordLeaderConfig[] = [
    {
      type: "hitter",
      sortField: "hitterHra",
      label: "타율",
      getValue: (record) => record.hitter?.battingAverage,
      formatValue: formatRate,
    },
    {
      type: "hitter",
      sortField: "hitterHr",
      label: "홈런",
      getValue: (record) => record.hitter?.homeRuns,
      formatValue: formatRecordValue,
    },
    {
      type: "hitter",
      sortField: "hitterRbi",
      label: "타점",
      getValue: (record) => record.hitter?.rbi,
      formatValue: formatRecordValue,
    },
    {
      type: "hitter",
      sortField: "hitterOps",
      label: "OPS",
      getValue: (record) => record.hitter?.ops,
      formatValue: formatRate,
    },
    {
      type: "hitter",
      sortField: "hitterWar",
      label: "WAR",
      getValue: (record) => record.hitter?.war,
      formatValue: (value) => formatRecordValue(value, 2),
    },
  ];
  const pitcherConfigs: PlayerRecordLeaderConfig[] = [
    {
      type: "pitcher",
      sortField: "pitcherEra",
      label: "ERA",
      getValue: (record) => record.pitcher?.era,
      formatValue: (value) => formatRecordValue(value, 2),
    },
    {
      type: "pitcher",
      sortField: "pitcherWin",
      label: "승",
      getValue: (record) => record.pitcher?.wins,
      formatValue: formatRecordValue,
    },
    {
      type: "pitcher",
      sortField: "pitcherSave",
      label: "세이브",
      getValue: (record) => record.pitcher?.saves,
      formatValue: formatRecordValue,
    },
    {
      type: "pitcher",
      sortField: "pitcherKk",
      label: "탈삼진",
      getValue: (record) => record.pitcher?.strikeouts,
      formatValue: formatRecordValue,
    },
    {
      type: "pitcher",
      sortField: "pitcherWhip",
      label: "WHIP",
      getValue: (record) => record.pitcher?.whip,
      formatValue: (value) => formatRecordValue(value, 2),
    },
    {
      type: "pitcher",
      sortField: "pitcherWar",
      label: "WAR",
      getValue: (record) => record.pitcher?.war,
      formatValue: (value) => formatRecordValue(value, 2),
    },
  ];
  const [hitterResults, pitcherResults] = await Promise.all([
    Promise.all(hitterConfigs.map(fetchPlayerRecordLeader)),
    Promise.all(pitcherConfigs.map(fetchPlayerRecordLeader)),
  ]);
  const defaultHitterResult = hitterResults[0].result;

  return {
    season: defaultHitterResult.season,
    source: defaultHitterResult.source,
    hitters: hitterResults.map(({ leader }) => leader),
    pitchers: pitcherResults.map(({ leader }) => leader),
  };
}

function formatOptionalNumber(
  value: number | null | undefined,
  formatter: (number: number) => string = String,
): string {
  return typeof value === "number" && Number.isFinite(value)
    ? formatter(value)
    : "-";
}

function formatPlayerRecordMatch(input: {
  type: "hitter" | "pitcher";
  result: Awaited<ReturnType<typeof fetchPlayerRecords>>;
  record: PlayerRecord;
}): PlayerRecordMatch {
  if (input.type === "hitter") {
    const hitter = input.record.hitter;

    return {
      type: "hitter",
      season: input.result.season,
      playerName: input.record.playerName,
      teamName: input.record.teamName,
      position: input.record.position,
      source: input.result.source,
      stats: [
        `타율 ${formatOptionalNumber(hitter?.battingAverage, formatRate)}`,
        `경기 ${formatOptionalNumber(hitter?.games)}`,
        `안타 ${formatOptionalNumber(hitter?.hits)}`,
        `홈런 ${formatOptionalNumber(hitter?.homeRuns)}`,
        `타점 ${formatOptionalNumber(hitter?.rbi)}`,
        `득점 ${formatOptionalNumber(hitter?.runs)}`,
        `도루 ${formatOptionalNumber(hitter?.steals)}`,
        `OPS ${formatOptionalNumber(hitter?.ops, formatRate)}`,
        `WAR ${formatOptionalNumber(hitter?.war, (value) =>
          formatRecordValue(value, 2),
        )}`,
      ],
    };
  }

  const pitcher = input.record.pitcher;

  return {
    type: "pitcher",
    season: input.result.season,
    playerName: input.record.playerName,
    teamName: input.record.teamName,
    position: input.record.position,
    source: input.result.source,
    stats: [
      `ERA ${formatOptionalNumber(pitcher?.era, (value) =>
        formatRecordValue(value, 2),
      )}`,
      `경기 ${formatOptionalNumber(pitcher?.games)}`,
      `승 ${formatOptionalNumber(pitcher?.wins)}`,
      `패 ${formatOptionalNumber(pitcher?.losses)}`,
      `세이브 ${formatOptionalNumber(pitcher?.saves)}`,
      `홀드 ${formatOptionalNumber(pitcher?.holds)}`,
      `이닝 ${pitcher?.innings || "-"}`,
      `탈삼진 ${formatOptionalNumber(pitcher?.strikeouts)}`,
      `WHIP ${formatOptionalNumber(pitcher?.whip, (value) =>
        formatRecordValue(value, 2),
      )}`,
      `WAR ${formatOptionalNumber(pitcher?.war, (value) =>
        formatRecordValue(value, 2),
      )}`,
    ],
  };
}

function matchesPlayerCandidate(
  record: PlayerRecord,
  candidates: string[],
): boolean {
  const playerName = record.playerName.replace(/\s+/g, "").toLowerCase();

  return candidates.some((candidate) => {
    const normalizedCandidate = candidate.replace(/\s+/g, "").toLowerCase();

    return (
      normalizedCandidate.length >= 2 &&
      (playerName.includes(normalizedCandidate) ||
        normalizedCandidate.includes(playerName))
    );
  });
}

async function fetchPlayerRecordSearch(
  question: string,
): Promise<PlayerRecordSearchMemory | null> {
  const candidates = extractPlayerNameCandidates(question);

  if (candidates.length === 0) {
    return null;
  }

  const configs: { type: "hitter" | "pitcher"; sortField: string }[] = [
    { type: "hitter", sortField: "hitterHra" },
    { type: "hitter", sortField: "hitterHr" },
    { type: "hitter", sortField: "hitterRbi" },
    { type: "hitter", sortField: "hitterOps" },
    { type: "hitter", sortField: "hitterWar" },
    { type: "pitcher", sortField: "pitcherEra" },
    { type: "pitcher", sortField: "pitcherWin" },
    { type: "pitcher", sortField: "pitcherSave" },
    { type: "pitcher", sortField: "pitcherHold" },
    { type: "pitcher", sortField: "pitcherKk" },
    { type: "pitcher", sortField: "pitcherWhip" },
    { type: "pitcher", sortField: "pitcherWar" },
  ];
  const results = await Promise.all(
    configs.map((config) =>
      fetchPlayerRecords({
        type: config.type,
        sortField: config.sortField,
        pageSize: 100,
      }).then((result) => ({ ...config, result })),
    ),
  );
  const matchesByKey = new Map<string, PlayerRecordMatch>();

  for (const item of results) {
    for (const record of item.result.records) {
      if (!matchesPlayerCandidate(record, candidates)) {
        continue;
      }

      const key = `${item.type}:${record.playerId}`;

      if (!matchesByKey.has(key)) {
        matchesByKey.set(
          key,
          formatPlayerRecordMatch({
            type: item.type,
            result: item.result,
            record,
          }),
        );
      }
    }
  }

  return {
    candidates,
    matches: [...matchesByKey.values()].slice(0, 4),
    source: results[0]?.result.source ?? "",
  };
}

function isSpecificPlayerRecordQuestion(question: string): boolean {
  return hasAnyKeyword(question, ["선수", "시즌", "기록", "성적", "스탯"]);
}

function formatPlayerSearchAnswer(playerSearch: PlayerRecordSearchMemory): string {
  if (playerSearch.matches.length === 0) {
    return `[선수 기록 검색]\n- ${playerSearch.candidates.join(", ")} 선수는 현재 기록실 데이터에서 시즌 기록을 찾지 못했습니다. 경기방이나 게시글에 이름이 보이더라도 시즌 기록으로 단정하지 않습니다.`;
  }

  const playerSearchLines = playerSearch.matches
    .map(
      (match) =>
        `- ${match.season}시즌 ${match.playerName}(${match.teamName}, ${match.position || match.type}): ${match.stats.join(", ")}`,
    )
    .join("\n");

  return `[선수 기록 검색]\n${playerSearchLines}`;
}

function formatFallbackAnswer(
  memory: AssistantMemory,
  question: string,
): string {
  if (memory.playerSearch && isSpecificPlayerRecordQuestion(question)) {
    return formatPlayerSearchAnswer(memory.playerSearch);
  }

  const sections: string[] = [];

  if (memory.gameRooms) {
    const gameLines =
      memory.gameRooms.rooms.length > 0
        ? memory.gameRooms.rooms
            .map((room) =>
              [
                `- ${room.title} ${room.score} (${room.status}, ${room.stadium})`,
                room.startingPitchers ? `선발: ${room.startingPitchers}` : "",
                room.decisionPitchers ? room.decisionPitchers : "",
                `경기방: ${room.url}`,
              ]
                .filter(Boolean)
                .join(" / "),
            )
            .join("\n")
        : "- 해당 날짜에 조회된 KBO 경기방이 없습니다.";

    sections.push(`[경기방]\n${memory.gameRooms.date} 기준\n${gameLines}`);
  }

  if (memory.standings) {
    const standingLines = memory.standings.rows
      .slice(0, 5)
      .map(
        (row) =>
          `- ${row.rank}위 ${row.team}: ${row.wins}승 ${row.draws}무 ${row.losses}패, 승률 ${row.winningRate}, 게임차 ${row.gamesBehind}`,
      )
      .join("\n");

    sections.push(`[순위]\n${memory.standings.seasonYear}시즌 상위권\n${standingLines}`);
  }

  if (memory.playerSearch) {
    sections.push(formatPlayerSearchAnswer(memory.playerSearch));
  }

  if (memory.playerRecords) {
    const hitterLines = memory.playerRecords.hitters
      .map(
        (leader) =>
          `- ${leader.label}: ${leader.rows
            .slice(0, 3)
            .map((row) => `${row.ranking}위 ${row.playerName}(${row.teamName}) ${row.value}`)
            .join(", ")}`,
      )
      .join("\n");
    const pitcherLines = memory.playerRecords.pitchers
      .map(
        (leader) =>
          `- ${leader.label}: ${leader.rows
            .slice(0, 3)
            .map((row) => `${row.ranking}위 ${row.playerName}(${row.teamName}) ${row.value}`)
            .join(", ")}`,
      )
      .join("\n");

    sections.push(
      `[기록실]\n${memory.playerRecords.season}시즌 타자 주요 기록\n${hitterLines}\n\n${memory.playerRecords.season}시즌 투수 주요 기록\n${pitcherLines}`,
    );
  }

  if (memory.posts.length > 0) {
    const postLines = memory.posts
      .slice(0, 4)
      .map(
        (post) =>
          `- ${post.title}: ${post.excerpt} (조회 ${post.viewCount}, 댓글 ${post.commentCount})`,
      )
      .join("\n");

    sections.push(`[게시판 관련 글]\n${postLines}`);
  }

  if (memory.hotPosts.length > 0) {
    const postLines = memory.hotPosts
      .slice(0, 4)
      .map(
        (post) =>
          `- ${post.title}: 조회 ${post.viewCount}, 댓글 ${post.commentCount} (${post.url})`,
      )
      .join("\n");

    sections.push(`[인기글]\n${postLines}`);
  }

  if (memory.recentPosts.length > 0) {
    const postLines = memory.recentPosts
      .slice(0, 4)
      .map((post) => `- ${post.title}: ${post.excerpt} (${post.url})`)
      .join("\n");

    sections.push(`[최신글]\n${postLines}`);
  }

  if (memory.news) {
    const newsLines =
      memory.news.articles.length > 0
        ? memory.news.articles
            .slice(0, 4)
            .map((article) => `- ${article.title} (${article.source})`)
            .join("\n")
        : "- 관련 뉴스를 찾지 못했습니다.";

    sections.push(`[뉴스]\n${newsLines}`);
  }

  if (memory.urlBriefing) {
    sections.push(
      `[URL 브리핑]\n${memory.urlBriefing.title}\n${
        memory.urlBriefing.description || memory.urlBriefing.excerpt
      }`,
    );
  }

  if (sections.length === 0) {
    return "지금 질문과 바로 연결되는 게시글이나 경기 정보를 찾지 못했습니다. 팀 이름, 날짜, 경기명을 조금 더 구체적으로 적어주면 더 잘 찾아볼 수 있어요.";
  }

  return sections.join("\n\n");
}

async function generateAnswer(input: {
  question: string;
  messages: BoardAssistantMessage[];
  memory: AssistantMemory;
}): Promise<string> {
  const fallback = formatFallbackAnswer(input.memory, input.question);
  const apiKey = getOpenAIApiKey();

  if (
    input.memory.playerSearch &&
    isSpecificPlayerRecordQuestion(input.question)
  ) {
    return fallback;
  }

  if (!apiKey) {
    return fallback;
  }

  const prompt = [
    "너는 KBO Talk 게시판의 오른쪽 사이드바 도우미다.",
    "사용자 질문에 대해 게시글, 인기글, 최신글, KBO 순위표, 선수 기록실, 경기방, 뉴스/URL 브리핑 정보만 근거로 답한다.",
    "게시판 내부 데이터와 외부 KBO 데이터가 함께 있으면 게시판 흐름을 먼저 설명하고, 필요한 경우 순위/기록/경기방 링크를 덧붙인다.",
    "선수 기록실 질문은 playerRecords에서 질문한 항목의 label을 찾아 rows[0]부터 그대로 사용하고, 직접 재정렬하거나 규정타석 미달 선수를 추정해서 끼워 넣지 않는다.",
    "특정 선수 이름을 물으면 playerSearch.matches를 가장 먼저 확인한다. matches가 비어 있으면 시즌 기록을 확인할 수 없다고 말하고, 게시글이나 경기방 내용을 시즌 기록처럼 바꿔 말하지 않는다.",
    "확인되지 않은 사실은 단정하지 말고, 정보가 부족하면 어떤 정보가 더 필요한지 말한다.",
    "말투는 야구 커뮤니티에 어울리게 자연스럽고 짧게 쓴다.",
    "답변은 2~5문장으로 시작하고, 필요하면 bullet을 3개 이하로 덧붙인다.",
    "",
    "[최근 대화]",
    JSON.stringify(input.messages.slice(-6), null, 2),
    "",
    "[사용자 질문]",
    input.question,
    "",
    "[수집한 정보]",
    JSON.stringify(input.memory, null, 2),
    "",
    "[LLM 사용 불가 시 기본 답변]",
    fallback,
  ].join("\n");

  try {
    const chat = new ChatOpenAI({
      apiKey,
      model: getChatModel(),
      temperature: 0.2,
    });
    const response = await chat.invoke(prompt);
    const answer = getMessageText(response.content);

    return answer || fallback;
  } catch (error) {
    console.error("Board assistant answer generation failed.", error);

    return fallback;
  }
}

export function validateBoardAssistantQuestion(question: string):
  | {
      ok: true;
      question: string;
    }
  | {
      ok: false;
      message: string;
    } {
  const normalizedQuestion = question.trim();

  if (
    normalizedQuestion.length < 2 ||
    normalizedQuestion.length > MAX_QUESTION_LENGTH
  ) {
    return {
      ok: false,
      message: `question must be between 2 and ${MAX_QUESTION_LENGTH} characters.`,
    };
  }

  return {
    ok: true,
    question: normalizedQuestion,
  };
}

export async function runBoardAssistantAgent(input: {
  question: string;
  selectedTeam?: string;
  messages?: BoardAssistantMessage[];
}): Promise<BoardAssistantResult> {
  const validation = validateBoardAssistantQuestion(input.question);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const question = validation.question;
  const selectedTeam = input.selectedTeam?.trim() || "";
  const steps: BoardAssistantStep[] = [];
  let sources: BoardAssistantSource[] = [];
  const memory: AssistantMemory = {
    posts: [],
    hotPosts: [],
    recentPosts: [],
    games: null,
    gameRooms: null,
    news: null,
  urlBriefing: null,
  playerRecords: null,
  playerSearch: null,
  standings: null,
};
  const team = extractTeam(question, selectedTeam);
  const date = extractDate(question);
  const url = extractUrl(question);
  const needsNews =
    Boolean(url) || hasAnyKeyword(question, ["뉴스", "기사", "이슈", "소식"]);

  try {
    memory.posts = await searchBoardPosts({ question, selectedTeam });
    steps.push({
      toolName: "search_board_posts",
      status: "success",
      summary: `게시판 관련 글 ${memory.posts.length}개를 조회했습니다.`,
    });
    sources = mergeSources(
      sources,
      memory.posts.map((post) => ({
        title: post.title,
        url: post.url,
        source: "게시판",
      })),
    );
  } catch (error) {
    steps.push({
      toolName: "search_board_posts",
      status: "error",
      summary:
        error instanceof Error
          ? error.message
          : "게시판 글을 조회하지 못했습니다.",
    });
  }

  try {
    const [hotPosts, recentPosts] = await Promise.all([
      fetchHotBoardPosts(),
      fetchRecentBoardPosts(),
    ]);

    memory.hotPosts = hotPosts;
    memory.recentPosts = recentPosts;
    steps.push({
      toolName: "fetch_board_overview",
      status: "success",
      summary: `인기글 ${hotPosts.length}개, 최신글 ${recentPosts.length}개를 조회했습니다.`,
    });
    sources = mergeSources(
      sources,
      [...hotPosts, ...recentPosts].map((post) => ({
        title: post.title,
        url: post.url,
        source: "게시판",
      })),
    );
  } catch (error) {
    steps.push({
      toolName: "fetch_board_overview",
      status: "error",
      summary:
        error instanceof Error
          ? error.message
          : "게시판 인기글/최신글을 조회하지 못했습니다.",
    });
  }

  try {
    const toolResult = await invokeBaseballMcpTool("get_kbo_games", {
      date,
      team,
    });
    const result = getMcpResult<KboGamesResult>(toolResult).structuredContent;

    memory.games = result;
    memory.gameRooms = buildGameRoomContext(result);
    steps.push({
      toolName: "get_kbo_games",
      status: "success",
      summary: `${result.date} KBO 경기방 ${result.games.length}개를 조회했습니다.`,
    });
    sources = mergeSources(sources, [
      {
        title: `${result.date} KBO 경기 일정/결과`,
        url: result.source,
        source: "KBO",
      },
      ...memory.gameRooms.rooms.map((room) => ({
        title: room.title,
        url: room.url,
        source: "경기방",
      })),
    ]);
  } catch (error) {
    steps.push({
      toolName: "get_kbo_games",
      status: "error",
      summary:
        error instanceof Error
          ? error.message
          : "KBO 경기방 정보를 조회하지 못했습니다.",
    });
  }

  try {
    const standings = await fetchKboStandings();

    memory.standings = {
      seasonYear: standings.seasonYear,
      rows: standings.rows.map((row) => ({
        rank: row.rank,
        team: row.team,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        winningRate: row.winningRate,
        gamesBehind: row.gamesBehind,
      })),
    };
    steps.push({
      toolName: "fetch_kbo_standings",
      status: "success",
      summary: "KBO 순위표를 조회했습니다.",
    });
    sources = mergeSources(sources, [
      {
        title: `${standings.seasonYear} KBO 순위`,
        url: standings.source,
        source: "KBO",
      },
    ]);
  } catch (error) {
    steps.push({
      toolName: "fetch_kbo_standings",
      status: "error",
      summary:
        error instanceof Error
          ? error.message
          : "KBO 순위표를 조회하지 못했습니다.",
    });
  }

  try {
    memory.playerRecords = await fetchPlayerRecordsMemory();
    steps.push({
      toolName: "fetch_player_records",
      status: "success",
      summary: "기록실 타자/투수 주요 리더보드를 조회했습니다.",
    });
    sources = mergeSources(sources, [
      {
        title: `${memory.playerRecords.season} KBO 선수 기록실`,
        url: memory.playerRecords.source,
        source: "기록실",
      },
    ]);
  } catch (error) {
    steps.push({
      toolName: "fetch_player_records",
      status: "error",
      summary:
        error instanceof Error
          ? error.message
          : "선수 기록실을 조회하지 못했습니다.",
    });
  }

  try {
    memory.playerSearch = await fetchPlayerRecordSearch(question);

    if (memory.playerSearch) {
      steps.push({
        toolName: "search_player_record",
        status: "success",
        summary:
          memory.playerSearch.matches.length > 0
            ? `선수 기록 ${memory.playerSearch.matches.length}건을 찾았습니다.`
            : `기록실에서 ${memory.playerSearch.candidates.join(", ")} 선수 기록을 찾지 못했습니다.`,
      });
      sources = mergeSources(sources, [
        {
          title: "KBO 선수 기록 검색",
          url: memory.playerSearch.source || "/records",
          source: "기록실",
        },
      ]);
    }
  } catch (error) {
    steps.push({
      toolName: "search_player_record",
      status: "error",
      summary:
        error instanceof Error
          ? error.message
          : "선수 기록 검색을 수행하지 못했습니다.",
    });
  }

  if (url) {
    try {
      const toolResult = await invokeBaseballMcpTool("brief_external_url", {
        url,
      });
      const result =
        getMcpResult<UrlBriefingResult>(toolResult).structuredContent;

      memory.urlBriefing = result;
      steps.push({
        toolName: "brief_external_url",
        status: "success",
        summary: "입력한 URL을 브리핑했습니다.",
      });
      sources = mergeSources(sources, [
        {
          title: result.title,
          url: result.url,
          source: "URL",
        },
      ]);
    } catch (error) {
      steps.push({
        toolName: "brief_external_url",
        status: "error",
        summary:
          error instanceof Error ? error.message : "URL을 분석하지 못했습니다.",
      });
    }
  }

  if (needsNews && !url) {
    try {
      const keyword = extractSearchTokens(question, selectedTeam).join(" ") || "KBO";
      const toolResult = await invokeBaseballMcpTool("search_baseball_news", {
        keyword,
      });
      const result = getMcpResult<NewsSearchResult>(toolResult).structuredContent;

      memory.news = result;
      steps.push({
        toolName: "search_baseball_news",
        status: "success",
        summary: `야구 뉴스 ${result.articles.length}개를 조회했습니다.`,
      });
      sources = mergeSources(
        sources,
        result.articles.map((article) => ({
          title: article.title,
          url: article.url,
          source: article.source,
        })),
      );
    } catch (error) {
      steps.push({
        toolName: "search_baseball_news",
        status: "error",
        summary:
          error instanceof Error
            ? error.message
            : "야구 뉴스를 조회하지 못했습니다.",
      });
    }
  }

  const answer = await generateAnswer({
    question,
    messages: input.messages ?? [],
    memory,
  });

  return {
    answer,
    steps,
    sources,
  };
}

import { ChatOpenAI } from "@langchain/openai";
import type { Prisma } from "@prisma/client";

import { getChatModel, getOpenAIApiKey } from "@/lib/ai/config";
import { fetchKboStandings } from "@/lib/kbo/standings";
import type {
  KboGamesResult,
  McpToolResult,
  NewsSearchResult,
  UrlBriefingResult,
} from "@/lib/mcp/baseball-briefing-tools";
import { invokeBaseballMcpTool } from "@/lib/mcp/json-rpc";
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

type AssistantMemory = {
  posts: BoardPostContext[];
  games: KboGamesResult | null;
  news: NewsSearchResult | null;
  urlBriefing: UrlBriefingResult | null;
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
  "요약",
  "알려줘",
  "보여줘",
  "정리해줘",
  "어때",
  "뭐야",
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

function getExcerpt(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();

  return normalized.length > 140
    ? `${normalized.slice(0, 140)}...`
    : normalized;
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

  const posts = await prisma.post.findMany({
    where: conditions.length > 0 ? { OR: conditions } : {},
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: 5,
    select: {
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
    },
  });

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    excerpt: getExcerpt(post.content),
    author: post.author.nickname,
    viewCount: post.viewCount,
    commentCount: post._count.comments,
    tags: post.tags.map(({ tag }) => tag.name),
    url: `/posts/${post.id}`,
  }));
}

function formatGame(game: KboGamesResult["games"][number]): string {
  const score =
    game.awayScore === null || game.homeScore === null
      ? "스코어 미정"
      : `${game.awayScore}:${game.homeScore}`;
  const status =
    game.status === "scheduled"
      ? "예정"
      : game.status === "live"
        ? "진행 중"
        : game.status === "draw"
          ? "무승부"
          : "종료";
  const starterText =
    game.awayStartingPitcher || game.homeStartingPitcher
      ? `, 선발 ${game.awayStartingPitcher?.name ?? "미정"} vs ${
          game.homeStartingPitcher?.name ?? "미정"
        }`
      : "";
  const decisionText =
    game.winningPitcher || game.losingPitcher || game.savePitcher
      ? `, 승 ${game.winningPitcher?.name ?? "-"} / 패 ${
          game.losingPitcher?.name ?? "-"
        } / 세 ${game.savePitcher?.name ?? "-"}`
      : "";

  return `${game.time} ${game.awayTeam} vs ${game.homeTeam} ${score} (${status}, ${game.stadium}${starterText}${decisionText})`;
}

function formatFallbackAnswer(memory: AssistantMemory): string {
  const sections: string[] = [];

  if (memory.games) {
    const gameLines =
      memory.games.games.length > 0
        ? memory.games.games.map((game) => `- ${formatGame(game)}`).join("\n")
        : "- 해당 날짜에 조회된 KBO 경기가 없습니다.";

    sections.push(`[경기 정보]\n${memory.games.date} 기준\n${gameLines}`);
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
  const fallback = formatFallbackAnswer(input.memory);
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return fallback;
  }

  const prompt = [
    "너는 KBO Talk 게시판의 오른쪽 사이드바 도우미다.",
    "사용자 질문에 대해 게시판 글, KBO 경기 정보, 뉴스/URL 브리핑, 순위 정보만 근거로 답한다.",
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
    games: null,
    news: null,
    urlBriefing: null,
    standings: null,
  };
  const team = extractTeam(question, selectedTeam);
  const date = extractDate(question);
  const url = extractUrl(question);
  const needsGameInfo =
    Boolean(date) ||
    hasAnyKeyword(question, [
      "경기",
      "결과",
      "일정",
      "선발",
      "투수",
      "스코어",
      "승리",
      "패배",
      "세이브",
      "승부",
    ]);
  const needsNews =
    Boolean(url) || hasAnyKeyword(question, ["뉴스", "기사", "이슈", "소식"]);
  const needsStandings = hasAnyKeyword(question, [
    "순위",
    "승률",
    "게임차",
    "1위",
    "상위",
    "하위",
  ]);

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

  if (needsGameInfo) {
    try {
      const toolResult = await invokeBaseballMcpTool("get_kbo_games", {
        date,
        team,
      });
      const result = getMcpResult<KboGamesResult>(toolResult).structuredContent;

      memory.games = result;
      steps.push({
        toolName: "get_kbo_games",
        status: "success",
        summary: `${result.date} KBO 경기 ${result.games.length}개를 조회했습니다.`,
      });
      sources = mergeSources(sources, [
        {
          title: `${result.date} KBO 경기 일정/결과`,
          url: result.source,
          source: "KBO",
        },
      ]);
    } catch (error) {
      steps.push({
        toolName: "get_kbo_games",
        status: "error",
        summary:
          error instanceof Error
            ? error.message
            : "KBO 경기 정보를 조회하지 못했습니다.",
      });
    }
  } else {
    steps.push({
      toolName: "get_kbo_games",
      status: "skipped",
      summary: "질문에 날짜나 경기 의도가 뚜렷하지 않아 경기 조회를 생략했습니다.",
    });
  }

  if (needsStandings) {
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

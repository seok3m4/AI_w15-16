import { ChatOpenAI } from "@langchain/openai";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

import { getChatModel, getOpenAIApiKey } from "@/lib/ai/config";
import { createMcpBriefing } from "@/lib/ai/mcp-briefing";
import type {
  KboGameRecordBriefingResult,
  KboGamesResult,
  McpToolResult,
} from "@/lib/mcp/baseball-briefing-tools";
import { invokeBaseballMcpTool } from "@/lib/mcp/json-rpc";
import { prisma } from "@/lib/prisma";

type AgentToolName =
  | "recommend_review_tags"
  | "search_board_posts"
  | "fetch_baseball_news_briefing"
  | "fetch_kbo_games"
  | "fetch_kbo_game_record";

type AgentToolCall = {
  id?: string;
  name: AgentToolName;
  args: Record<string, unknown>;
};

type AgentToolStep = {
  iteration: number;
  toolName: string;
  status: "success" | "error" | "skipped";
  summary: string;
};

type AgentSource = {
  title: string;
  url: string;
  source?: string;
};

type AgentMemory = {
  recommendedTags?: string[];
  relatedPosts?: {
    id: string;
    title: string;
    excerpt: string;
    url: string;
  }[];
  newsBriefing?: string;
  kboGames?: KboGamesResult;
  officialRecord?: KboGameRecordBriefingResult;
  sources: AgentSource[];
};

type AgentState = {
  memo: string;
  favoriteTeam: string;
  gameDate: string;
  steps: AgentToolStep[];
  memory: AgentMemory;
  executedToolKeys: Set<string>;
};

export type ReviewAgentResult = {
  title: string;
  tags: string[];
  draft: string;
  checklist: string[];
  steps: AgentToolStep[];
  sources: AgentSource[];
};

const MAX_AGENT_ITERATIONS = 4;
const MAX_MEMO_LENGTH = 1200;
const DEFAULT_TITLE = "경기 흐름을 돌아보는 야구 리뷰";

const teamKeywords = [
  "LG",
  "엘지",
  "두산",
  "키움",
  "SSG",
  "랜더스",
  "KIA",
  "기아",
  "삼성",
  "롯데",
  "한화",
  "NC",
  "엔씨",
  "KT",
  "케이티",
];

const themeKeywords = [
  "선발",
  "불펜",
  "타선",
  "수비",
  "역전",
  "끝내기",
  "홈런",
  "도루",
  "실책",
  "감독",
  "트레이드",
  "부상",
  "연장",
  "포스트시즌",
];

const reviewAgentTools = [
  {
    type: "function",
    function: {
      name: "recommend_review_tags",
      description:
        "Recommend concise Korean tags for a baseball game review memo.",
      parameters: {
        type: "object",
        properties: {
          memo: {
            type: "string",
            description: "사용자가 입력한 경기 메모",
          },
        },
        required: ["memo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_board_posts",
      description:
        "Search existing board posts for context related to the game memo.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "게시판에서 검색할 야구 키워드",
          },
          limit: {
            type: "number",
            description: "가져올 게시글 수",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_baseball_news_briefing",
      description:
        "Fetch an external baseball news briefing through the MCP news tool.",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "뉴스 검색에 사용할 팀, 선수, 이슈 키워드",
          },
        },
        required: ["keyword"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_kbo_games",
      description:
        "Fetch official KBO game schedule and result data for a date and optional team.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "조회할 날짜. YYYY-MM-DD 형식",
          },
          team: {
            type: "string",
            description: "조회할 KBO 팀명. 예: LG, 한화, SSG, KIA",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_kbo_game_record",
      description:
        "Fetch official KBO score board and boxscore briefing for one selected game.",
      parameters: {
        type: "object",
        properties: {
          gameId: {
            type: "string",
            description:
              "KBO gameId. If omitted, the agent uses the best game from fetch_kbo_games result.",
          },
        },
      },
    },
  },
] as const;

function getTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getBoundedLimit(value: unknown): number {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return 3;
  }

  return Math.min(limit, 5);
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function mergeSources(
  currentSources: AgentSource[],
  nextSources: AgentSource[],
): AgentSource[] {
  const sourceMap = new Map<string, AgentSource>();

  for (const source of [...currentSources, ...nextSources]) {
    if (source.url) {
      sourceMap.set(source.url, source);
    }
  }

  return [...sourceMap.values()];
}

function includesKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function normalizeOptionalGameDate(value: unknown): string {
  const rawDate = getTrimmedString(value);

  if (!rawDate) {
    return "";
  }

  const match = rawDate.match(/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})$/);

  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function extractGameDateFromMemo(memo: string): string {
  const exactMatch = memo.match(/(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);

  if (exactMatch) {
    const [, year, month, day] = exactMatch;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const monthDayMatch = memo.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);

  if (!monthDayMatch) {
    return "";
  }

  const year = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
  const [, month, day] = monthDayMatch;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractReviewTags(memo: string, favoriteTeam: string): string[] {
  const tags = ["경기리뷰"];
  const source = `${favoriteTeam} ${memo}`;

  for (const keyword of teamKeywords) {
    if (includesKeyword(source, keyword)) {
      tags.push(keyword.replace("엘지", "LG").replace("기아", "KIA"));
    }
  }

  for (const keyword of themeKeywords) {
    if (includesKeyword(source, keyword)) {
      tags.push(keyword);
    }
  }

  if (includesKeyword(source, "투수") && !tags.includes("투수")) {
    tags.push("투수");
  }

  if (includesKeyword(source, "타자") && !tags.includes("타자")) {
    tags.push("타자");
  }

  return uniq(tags).slice(0, 6);
}

function getSearchKeyword(memo: string, favoriteTeam: string): string {
  const tags = extractReviewTags(memo, favoriteTeam).filter(
    (tag) => tag !== "경기리뷰",
  );

  return tags[0] ?? memo.split(/\s+/).slice(0, 3).join(" ");
}

function getPreview(content: string): string {
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
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

      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof part.text === "string"
      ) {
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
  if (
    typeof value !== "object" ||
    value === null ||
    !("structuredContent" in value)
  ) {
    throw new Error("MCP response is invalid.");
  }

  return value as McpToolResult<TStructuredContent>;
}

function getToolCalls(message: unknown): AgentToolCall[] {
  if (
    typeof message !== "object" ||
    message === null ||
    !("tool_calls" in message) ||
    !Array.isArray(message.tool_calls)
  ) {
    return [];
  }

  const toolCalls = message.tool_calls as unknown[];
  const parsedToolCalls: AgentToolCall[] = [];

  for (const toolCall of toolCalls) {
    if (
      typeof toolCall !== "object" ||
      toolCall === null ||
      !("name" in toolCall) ||
      typeof toolCall.name !== "string"
    ) {
      continue;
    }

    parsedToolCalls.push({
      id:
        "id" in toolCall && typeof toolCall.id === "string"
          ? toolCall.id
          : undefined,
      name: toolCall.name as AgentToolName,
      args:
        "args" in toolCall &&
        typeof toolCall.args === "object" &&
        toolCall.args !== null
          ? (toolCall.args as Record<string, unknown>)
          : {},
    });
  }

  return parsedToolCalls;
}

function createToolKey(toolName: string, args: Record<string, unknown>): string {
  return `${toolName}:${JSON.stringify(args)}`;
}

async function recommendReviewTags(
  state: AgentState,
  args: Record<string, unknown>,
) {
  const memo = getTrimmedString(args.memo) || state.memo;
  const tags = extractReviewTags(memo, state.favoriteTeam);

  state.memory.recommendedTags = tags;

  return {
    tags,
    summary: `추천 태그 ${tags.length}개를 만들었습니다.`,
  };
}

async function searchBoardPosts(
  state: AgentState,
  args: Record<string, unknown>,
) {
  const query = getTrimmedString(args.query) || getSearchKeyword(state.memo, state.favoriteTeam);
  const limit = getBoundedLimit(args.limit);
  const posts = await prisma.post.findMany({
    where: {
      OR: [
        {
          title: {
            contains: query,
          },
        },
        {
          content: {
            contains: query,
          },
        },
        {
          tags: {
            some: {
              tag: {
                name: {
                  contains: query,
                },
              },
            },
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
    },
  });
  const relatedPosts = posts.map((post) => ({
    id: post.id,
    title: post.title,
    excerpt: getPreview(post.content),
    url: `/posts/${post.id}`,
  }));

  state.memory.relatedPosts = relatedPosts;

  return {
    query,
    relatedPosts,
    summary: `게시판에서 "${query}" 관련 글 ${relatedPosts.length}개를 찾았습니다.`,
  };
}

async function fetchBaseballNewsBriefing(
  state: AgentState,
  args: Record<string, unknown>,
) {
  const keyword =
    getTrimmedString(args.keyword) || getSearchKeyword(state.memo, state.favoriteTeam);
  const briefing = await createMcpBriefing("keyword", keyword);

  state.memory.newsBriefing = briefing.briefing;
  state.memory.sources = mergeSources(state.memory.sources, briefing.sources);

  return {
    keyword,
    briefing: briefing.briefing,
    sources: briefing.sources,
    summary: `MCP로 "${keyword}" 뉴스 브리핑을 생성했습니다.`,
  };
}

async function fetchKboGames(
  state: AgentState,
  args: Record<string, unknown>,
) {
  const date = getTrimmedString(args.date) || state.gameDate;
  const team = getTrimmedString(args.team) || state.favoriteTeam;
  const toolResult = await invokeBaseballMcpTool("get_kbo_games", {
    date,
    team,
  });
  const result = getMcpResult<KboGamesResult>(toolResult).structuredContent;

  state.memory.kboGames = result;
  state.memory.sources = mergeSources(state.memory.sources, [
    {
      title: `KBO 공식 경기 일정/결과 ${result.date}`,
      url: result.source,
      source: "KBO",
    },
  ]);

  return {
    date: result.date,
    team: result.team,
    games: result.games,
    summary: `KBO 공식 경기 데이터 ${result.games.length}건을 조회했습니다.`,
  };
}

function selectKboGameForRecord(
  state: AgentState,
  args: Record<string, unknown>,
): KboGamesResult["games"][number] | null {
  const gameId = getTrimmedString(args.gameId);
  const games = state.memory.kboGames?.games ?? [];

  if (gameId) {
    return games.find((game) => game.gameId === gameId) ?? null;
  }

  if (games.length === 0) {
    return null;
  }

  if (games.length === 1) {
    return games[0];
  }

  const team = state.favoriteTeam.toLowerCase();
  const teamGame = team
    ? games.find(
        (game) =>
          game.awayTeam.toLowerCase().includes(team) ||
          game.homeTeam.toLowerCase().includes(team),
      )
    : null;

  return teamGame ?? games.find((game) => game.status === "completed") ?? games[0];
}

async function fetchKboGameRecord(
  state: AgentState,
  args: Record<string, unknown>,
) {
  if (!state.memory.kboGames && state.gameDate) {
    await fetchKboGames(state, {
      date: state.gameDate,
      team: state.favoriteTeam,
    });
  }

  const game = selectKboGameForRecord(state, args);

  if (!game) {
    throw new Error("공식 기록을 조회할 KBO 경기를 찾지 못했습니다.");
  }

  const toolResult = await invokeBaseballMcpTool("brief_kbo_game_record", {
    gameId: game.gameId,
    gameDate: game.gameDate,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
    awayScore: game.awayScore,
    homeScore: game.homeScore,
    status: game.status,
    stadium: game.stadium,
    reviewUrl: game.reviewUrl,
    highlightUrl: game.highlightUrl,
  });
  const result =
    getMcpResult<KboGameRecordBriefingResult>(toolResult).structuredContent;

  state.memory.officialRecord = result;

  if (result.sourceUrl) {
    state.memory.sources = mergeSources(state.memory.sources, [
      {
        title: `${result.gameDate} ${result.awayTeam} vs ${result.homeTeam} KBO 공식 기록`,
        url: result.sourceUrl,
        source: "KBO",
      },
    ]);
  }

  return {
    record: result,
    summary: `KBO 공식 기록 ${result.recordItems.length}개를 경기 리뷰 근거로 확보했습니다.`,
  };
}

async function executeAgentTool(
  state: AgentState,
  toolCall: AgentToolCall,
) {
  if (toolCall.name === "recommend_review_tags") {
    return recommendReviewTags(state, toolCall.args);
  }

  if (toolCall.name === "search_board_posts") {
    return searchBoardPosts(state, toolCall.args);
  }

  if (toolCall.name === "fetch_baseball_news_briefing") {
    return fetchBaseballNewsBriefing(state, toolCall.args);
  }

  if (toolCall.name === "fetch_kbo_games") {
    return fetchKboGames(state, toolCall.args);
  }

  if (toolCall.name === "fetch_kbo_game_record") {
    return fetchKboGameRecord(state, toolCall.args);
  }

  throw new Error(`Unknown agent tool: ${toolCall.name}`);
}

function buildAgentSystemPrompt(): string {
  return [
    "너는 야구 게시판의 AI Agent 경기 리뷰 작성 도우미다.",
    "단순 답변 대신 필요한 도구를 선택해 실행하고, 도구 결과를 기억한 뒤 최종 리뷰 초안을 만든다.",
    "가능하면 recommend_review_tags를 먼저 사용하고, 게시판 맥락이 필요하면 search_board_posts를 사용해라.",
    "경기 날짜가 있거나 메모에서 날짜를 알 수 있으면 fetch_kbo_games로 공식 경기 결과를 먼저 확인해라.",
    "fetch_kbo_games 결과에서 리뷰할 경기 하나를 고를 수 있으면 fetch_kbo_game_record로 공식 스코어보드와 박스스코어를 확인해라.",
    "최신 외부 이슈가 필요할 때만 fetch_baseball_news_briefing을 사용해라.",
    "같은 도구와 같은 인자는 반복 호출하지 마라.",
    "도구 호출은 최대 4회까지만 가능하다.",
  ].join("\n");
}

function buildAgentUserPrompt(
  memo: string,
  favoriteTeam: string,
  gameDate: string,
): string {
  return [
    "아래 경기 메모를 바탕으로 게시판에 올릴 경기 리뷰를 도와줘.",
    `응원팀/관심팀: ${favoriteTeam || "미입력"}`,
    `경기 날짜: ${gameDate || "미입력"}`,
    `[경기 메모]\n${memo}`,
  ].join("\n\n");
}

function formatGameSummaryForDraft(
  game: KboGamesResult["games"][number],
): string {
  const score =
    game.awayScore === null || game.homeScore === null
      ? "스코어 미정"
      : `${game.awayTeam} ${game.awayScore} : ${game.homeScore} ${game.homeTeam}`;
  const stadium = game.stadium ? `, ${game.stadium}` : "";

  return `${game.gameDate} ${score}${stadium}`;
}

function buildFallbackResult(state: AgentState): ReviewAgentResult {
  const tags =
    state.memory.recommendedTags ?? extractReviewTags(state.memo, state.favoriteTeam);
  const selectedGame = state.memory.kboGames?.games[0];
  const officialRecordItems = state.memory.officialRecord?.recordItems.slice(0, 6) ?? [];
  const recordText =
    officialRecordItems.length > 0
      ? officialRecordItems.map((item) => `- ${item}`).join("\n")
      : "";

  return {
    title: selectedGame
      ? `${selectedGame.gameDate} ${selectedGame.awayTeam} vs ${selectedGame.homeTeam} 리뷰`
      : tags.length > 1
        ? `${tags[1]} 경기 리뷰`
        : DEFAULT_TITLE,
    tags,
    draft: [
      selectedGame
        ? `${formatGameSummaryForDraft(selectedGame)} 경기 리뷰입니다.`
        : "이번 경기는 메모에서 드러난 흐름처럼 초반 분위기와 후반 승부처가 뚜렷하게 갈린 경기였습니다.",
      state.memo,
      recordText
        ? `공식 기록에서 확인한 포인트는 다음과 같습니다.\n${recordText}`
        : "",
      "게시글에서는 인상적인 장면, 승부처, 다음 경기에서 확인하고 싶은 점을 나누어 정리하면 좋습니다.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    checklist: [
      "결승타, 홈런, 실책 중 승부에 가장 컸던 장면 하나를 선택해 의견 추가하기",
      "선발/불펜/타선 중 핵심 포인트를 한 문단으로 보강하기",
      "다음 경기에서 확인하고 싶은 점 적기",
    ],
    steps: state.steps,
    sources: state.memory.sources,
  };
}

function parseFinalJson(text: string): Partial<ReviewAgentResult> | null {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]) as Partial<ReviewAgentResult>;
  } catch {
    return null;
  }
}

async function generateFinalResult(state: AgentState): Promise<ReviewAgentResult> {
  const apiKey = getOpenAIApiKey();
  const fallback = buildFallbackResult(state);

  if (!apiKey) {
    return fallback;
  }

  const prompt = [
    "너는 야구 게시판에 올릴 경기 리뷰 초안을 작성한다.",
    "아래 Agent state와 tool 결과만 근거로 작성해라.",
    "오늘 경기를 보지 않은 사람도 대략적인 흐름을 이해할 수 있게 작성해라.",
    "공식 기록이 있으면 점수, 득점 이닝, 결승타, 홈런, 실책, 주요 투수 기록을 자연스럽게 반영해라.",
    "본문은 4~6문단으로 작성하고, 첫 문단에는 날짜/팀/점수/구장을 요약해라.",
    "이후 문단은 경기 흐름, 승부처, 타선 포인트, 마운드 포인트, 아쉬웠던 플레이 순서로 정리해라.",
    "확인되지 않은 선수 이름이나 기록은 지어내지 마라.",
    "\"Agent\", \"도구\", \"자료를 보면\", \"공식 기록에서 확인한 포인트\" 같은 메타 표현은 본문에 쓰지 마라.",
    "제목은 가능하면 'YYYY-MM-DD 원정팀 vs 홈팀 리뷰' 형식으로 만들어라.",
    "반드시 JSON만 반환해라.",
    "JSON schema: {\"title\":\"string\",\"tags\":[\"string\"],\"draft\":\"string\",\"checklist\":[\"string\"]}",
    "",
    "[Agent state]",
    JSON.stringify(
      {
        memo: state.memo,
        favoriteTeam: state.favoriteTeam,
        memory: state.memory,
        steps: state.steps,
      },
      null,
      2,
    ),
  ].join("\n");

  try {
    const chat = new ChatOpenAI({
      apiKey,
      model: getChatModel(),
      temperature: 0.3,
    });
    const response = await chat.invoke(prompt);
    const parsed = parseFinalJson(getMessageText(response.content));

    return {
      title: parsed?.title || fallback.title,
      tags:
        Array.isArray(parsed?.tags) && parsed.tags.length > 0
          ? uniq([...parsed.tags, ...fallback.tags]).slice(0, 8)
          : fallback.tags,
      draft: parsed?.draft || fallback.draft,
      checklist:
        Array.isArray(parsed?.checklist) && parsed.checklist.length > 0
          ? parsed.checklist.slice(0, 5)
          : fallback.checklist,
      steps: state.steps,
      sources: state.memory.sources,
    };
  } catch (error) {
    console.error("Failed to generate final review agent result.", error);

    return fallback;
  }
}

export function validateReviewAgentInput(input: {
  memo: string;
  favoriteTeam?: string;
  gameDate?: string;
}):
  | {
      ok: true;
      data: {
        memo: string;
        favoriteTeam: string;
        gameDate: string;
      };
    }
  | {
      ok: false;
      message: string;
} {
  const memo = input.memo.trim();
  const favoriteTeam = input.favoriteTeam?.trim() ?? "";
  const gameDate =
    normalizeOptionalGameDate(input.gameDate) || extractGameDateFromMemo(memo);

  if (memo.length < 10 || memo.length > MAX_MEMO_LENGTH) {
    return {
      ok: false,
      message: `memo must be between 10 and ${MAX_MEMO_LENGTH} characters.`,
    };
  }

  if (favoriteTeam.length > 40) {
    return {
      ok: false,
      message: "favoriteTeam must be 40 characters or fewer.",
    };
  }

  return {
    ok: true,
    data: {
      memo,
      favoriteTeam,
      gameDate,
    },
  };
}

async function enrichOfficialGameContext(state: AgentState): Promise<void> {
  if (!state.gameDate || state.memory.officialRecord) {
    return;
  }

  if (!state.memory.kboGames) {
    try {
      await fetchKboGames(state, {
        date: state.gameDate,
        team: state.favoriteTeam,
      });
      state.steps.push({
        iteration: MAX_AGENT_ITERATIONS,
        toolName: "fetch_kbo_games",
        status: "success",
        summary: "최종 초안 생성을 위해 KBO 공식 경기 결과를 보강했습니다.",
      });
    } catch (error) {
      state.steps.push({
        iteration: MAX_AGENT_ITERATIONS,
        toolName: "fetch_kbo_games",
        status: "error",
        summary:
          error instanceof Error
            ? error.message
            : "KBO 공식 경기 결과를 보강하지 못했습니다.",
      });
    }
  }

  if (!state.memory.kboGames?.games.length || state.memory.officialRecord) {
    return;
  }

  try {
    const result = await fetchKboGameRecord(state, {});

    state.steps.push({
      iteration: MAX_AGENT_ITERATIONS,
      toolName: "fetch_kbo_game_record",
      status: "success",
      summary: result.summary,
    });
  } catch (error) {
    state.steps.push({
      iteration: MAX_AGENT_ITERATIONS,
      toolName: "fetch_kbo_game_record",
      status: "error",
      summary:
        error instanceof Error
          ? error.message
          : "KBO 공식 기록을 보강하지 못했습니다.",
    });
  }
}

export async function runReviewAgent(input: {
  memo: string;
  favoriteTeam?: string;
  gameDate?: string;
}): Promise<ReviewAgentResult> {
  const validation = validateReviewAgentInput(input);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const state: AgentState = {
    memo: validation.data.memo,
    favoriteTeam: validation.data.favoriteTeam,
    gameDate: validation.data.gameDate,
    steps: [],
    memory: {
      sources: [],
    },
    executedToolKeys: new Set(),
  };
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    await recommendReviewTags(state, { memo: state.memo });
    await searchBoardPosts(state, {
      query: getSearchKeyword(state.memo, state.favoriteTeam),
    });
    await enrichOfficialGameContext(state);

    return generateFinalResult(state);
  }

  const chat = new ChatOpenAI({
    apiKey,
    model: getChatModel(),
    temperature: 0.1,
  });
  const chatWithTools = chat.bindTools([...reviewAgentTools], {
    tool_choice: "auto",
    parallel_tool_calls: false,
  });
  const messages: BaseMessage[] = [
    new SystemMessage(buildAgentSystemPrompt()),
    new HumanMessage(
      buildAgentUserPrompt(state.memo, state.favoriteTeam, state.gameDate),
    ),
  ];

  for (let iteration = 1; iteration <= MAX_AGENT_ITERATIONS; iteration += 1) {
    const aiMessage = await chatWithTools.invoke(messages);
    const toolCalls = getToolCalls(aiMessage).slice(0, 1);

    messages.push(aiMessage);

    if (toolCalls.length === 0) {
      break;
    }

    for (const toolCall of toolCalls) {
      const toolKey = createToolKey(toolCall.name, toolCall.args);
      const toolCallId = toolCall.id ?? `${toolCall.name}-${iteration}`;

      if (state.executedToolKeys.has(toolKey)) {
        const summary = `중복 도구 호출을 건너뛰었습니다: ${toolCall.name}`;

        state.steps.push({
          iteration,
          toolName: toolCall.name,
          status: "skipped",
          summary,
        });
        messages.push(
          new ToolMessage({
            content: summary,
            tool_call_id: toolCallId,
            status: "error",
          }),
        );
        continue;
      }

      state.executedToolKeys.add(toolKey);

      try {
        const result = await executeAgentTool(state, toolCall);

        state.steps.push({
          iteration,
          toolName: toolCall.name,
          status: "success",
          summary: result.summary,
        });
        messages.push(
          new ToolMessage({
            content: JSON.stringify(result),
            tool_call_id: toolCallId,
            status: "success",
          }),
        );
      } catch (error) {
        const summary =
          error instanceof Error ? error.message : "Agent tool failed.";

        state.steps.push({
          iteration,
          toolName: toolCall.name,
          status: "error",
          summary,
        });
        messages.push(
          new ToolMessage({
            content: summary,
            tool_call_id: toolCallId,
            status: "error",
          }),
        );
      }
    }
  }

  if (!state.memory.recommendedTags) {
    await recommendReviewTags(state, { memo: state.memo });
    state.steps.push({
      iteration: MAX_AGENT_ITERATIONS,
      toolName: "recommend_review_tags",
      status: "success",
      summary: "최종 초안 생성을 위해 기본 태그 추천을 보강했습니다.",
    });
  }

  await enrichOfficialGameContext(state);

  return generateFinalResult(state);
}

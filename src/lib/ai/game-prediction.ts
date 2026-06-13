import { ChatOpenAI } from "@langchain/openai";

import { getChatModel, getOpenAIApiKey } from "@/lib/ai/config";
import type { KboGame } from "@/lib/kbo/game";
import {
  type KboStandingRow,
  fetchKboStandings,
} from "@/lib/kbo/standings";

export type GamePredictionResult = {
  predictedTeam: string;
  confidence: "낮음" | "보통" | "높음";
  awayWinProbability: number;
  homeWinProbability: number;
  summary: string;
  factors: string[];
  caveats: string[];
  lineupApplied: boolean;
  lineupSummary: string[];
  modelUsed: boolean;
  standingsSource: string;
};

type PredictionInput = {
  game: KboGame;
};

type TeamSide = "away" | "home";

type TeamScore = {
  side: TeamSide;
  team: string;
  score: number;
  standing: KboStandingRow | null;
  lineup: TeamLineup | null;
  factors: string[];
};

type LineupBatter = {
  name: string;
  batOrder: number;
  position: string;
  battingAverage: number | null;
  homeRuns: number | null;
  rbi: number | null;
  war: number | null;
  isStarter: boolean;
};

type TeamLineup = {
  team: string;
  batters: LineupBatter[];
  starterCount: number;
  averageBattingAverage: number | null;
  coreBattingAverage: number | null;
  highAverageCount: number;
  totalWar: number | null;
  coreWar: number | null;
  strength: number;
};

type GameLineup = {
  source: string;
  away: TeamLineup | null;
  home: TeamLineup | null;
};

const NAVER_SPORTS_API_BASE_URL = "https://api-gw.sports.naver.com";
const KBO_BASE_URL = "https://www.koreabaseball.com";
const KBO_LINEUP_ANALYSIS_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetLineUpAnalysis`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

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

function parseWinningRate(value: string): number {
  const rate = Number(value);

  return Number.isFinite(rate) ? rate : 0;
}

function parseLastTenRecord(value: string): {
  wins: number;
  draws: number;
  losses: number;
} {
  const match = value.match(/(\d+)승(\d+)무(\d+)패/);

  if (!match) {
    return {
      wins: 0,
      draws: 0,
      losses: 0,
    };
  }

  return {
    wins: Number(match[1]),
    draws: Number(match[2]),
    losses: Number(match[3]),
  };
}

function parseRecord(value: string): {
  wins: number;
  losses: number;
  draws: number;
} {
  const [wins, losses, draws] = value.split("-").map(Number);

  return {
    wins: Number.isFinite(wins) ? wins : 0,
    losses: Number.isFinite(losses) ? losses : 0,
    draws: Number.isFinite(draws) ? draws : 0,
  };
}

function getRecordRate(record: {
  wins: number;
  losses: number;
  draws: number;
}): number {
  const decisions = record.wins + record.losses;

  return decisions > 0 ? record.wins / decisions : 0.5;
}

function getStreakScore(value: string): number {
  const match = value.match(/(\d+)(승|패|무)/);

  if (!match) {
    return 0;
  }

  const count = Number(match[1]);
  const type = match[2];

  if (!Number.isFinite(count) || type === "무") {
    return 0;
  }

  return type === "승" ? Math.min(count, 5) : -Math.min(count, 5);
}

function findStanding(
  rows: KboStandingRow[],
  team: string,
): KboStandingRow | null {
  return rows.find((row) => row.team.toLowerCase() === team.toLowerCase()) ?? null;
}

function toNaverGameId(game: KboGame): string | null {
  const gameId = game.gameId?.trim().toUpperCase();

  if (!gameId) {
    return null;
  }

  if (/^\d{8}[A-Z]{4}\d\d{4}$/.test(gameId)) {
    return gameId;
  }

  if (/^\d{8}[A-Z]{4}\d$/.test(gameId)) {
    return `${gameId}${game.gameDate.slice(0, 4) || gameId.slice(0, 4)}`;
  }

  return null;
}

async function fetchNaverJson<T>(path: string, gameId: string): Promise<T> {
  const response = await fetch(`${NAVER_SPORTS_API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      Referer: `https://m.sports.naver.com/game/${gameId}`,
      "X-Sports-Backend": "kotlin",
    },
    next: {
      revalidate: 60,
    },
  });

  if (!response.ok) {
    throw new Error("Naver lineup lookup failed.");
  }

  return (await response.json()) as T;
}

function getNestedArray(value: unknown, path: string[]): unknown[] {
  let current = value;

  for (const key of path) {
    if (!isRecord(current)) {
      return [];
    }

    current = current[key];
  }

  return Array.isArray(current) ? current : [];
}

function normalizeBatter(value: unknown): LineupBatter | null {
  if (!isRecord(value)) {
    return null;
  }

  const name =
    getString(value.name) ||
    getString(value.playerName) ||
    getString(value.batterName);
  const batOrder =
    getNumber(value.batOrder) ??
    getNumber(value.battingOrder) ??
    getNumber(value.order);

  if (!name || batOrder === null || batOrder <= 0) {
    return null;
  }

  return {
    name,
    batOrder,
    position:
      getString(value.pos) ||
      getString(value.position) ||
      getString(value.posName),
    battingAverage:
      getNumber(value.seasonHra) ??
      getNumber(value.hra) ??
      getNumber(value.avg) ??
      getNumber(value.battingAverage),
    homeRuns:
      getNumber(value.seasonHr) ??
      getNumber(value.hr) ??
      getNumber(value.homeRun),
    rbi:
      getNumber(value.seasonRbi) ??
      getNumber(value.rbi) ??
      getNumber(value.runsBattedIn),
    war:
      getNumber(value.war) ??
      getNumber(value.WAR) ??
      getNumber(value.warRt) ??
      getNumber(value.WAR_RT),
    isStarter: value.substituteIn !== true && value.starting !== false,
  };
}

function dedupeStartingBatters(batters: LineupBatter[]): LineupBatter[] {
  const byOrder = new Map<number, LineupBatter>();
  const sortedBatters = [...batters].sort((left, right) => {
    if (left.isStarter !== right.isStarter) {
      return left.isStarter ? -1 : 1;
    }

    return left.batOrder - right.batOrder;
  });

  for (const batter of sortedBatters) {
    if (!byOrder.has(batter.batOrder)) {
      byOrder.set(batter.batOrder, batter);
    }
  }

  return [...byOrder.values()]
    .sort((left, right) => left.batOrder - right.batOrder)
    .slice(0, 9);
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sum(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0);
}

function buildTeamLineup(team: string, rawBatters: unknown[]): TeamLineup | null {
  const batters = dedupeStartingBatters(
    rawBatters
      .map(normalizeBatter)
      .filter((batter): batter is LineupBatter => Boolean(batter)),
  );

  if (batters.length === 0) {
    return null;
  }

  const battingAverages = batters
    .map((batter) => batter.battingAverage)
    .filter((value): value is number => value !== null);
  const coreAverages = batters
    .filter((batter) => batter.batOrder >= 3 && batter.batOrder <= 5)
    .map((batter) => batter.battingAverage)
    .filter((value): value is number => value !== null);
  const warValues = batters
    .map((batter) => batter.war)
    .filter((value): value is number => value !== null);
  const coreWarValues = batters
    .filter((batter) => batter.batOrder >= 3 && batter.batOrder <= 5)
    .map((batter) => batter.war)
    .filter((value): value is number => value !== null);
  const averageBattingAverage = average(battingAverages);
  const coreBattingAverage = average(coreAverages);
  const highAverageCount = battingAverages.filter((value) => value >= 0.3).length;
  const totalWar = sum(warValues);
  const coreWar = sum(coreWarValues);
  const warStrength =
    totalWar === null ? 0 : totalWar * 1.25 + (coreWar ?? 0) * 0.75;
  const strength =
    (averageBattingAverage ?? 0.26) * 70 +
    (coreBattingAverage ?? 0.26) * 45 +
    highAverageCount * 1.4 +
    warStrength +
    Math.min(batters.length, 9) * 0.25;

  return {
    team,
    batters,
    starterCount: batters.length,
    averageBattingAverage,
    coreBattingAverage,
    highAverageCount,
    totalWar,
    coreWar,
    strength,
  };
}

function extractLineupFromLineupData(
  value: unknown,
  game: KboGame,
  source: string,
): GameLineup | null {
  const awayRaw =
    getNestedArray(value, ["result", "lineUpData", "away", "batter"]) ??
    [];
  const homeRaw =
    getNestedArray(value, ["result", "lineUpData", "home", "batter"]) ??
    [];
  const away = buildTeamLineup(game.awayTeam, awayRaw);
  const home = buildTeamLineup(game.homeTeam, homeRaw);

  return away || home ? { source, away, home } : null;
}

function extractLineupFromRecordData(
  value: unknown,
  game: KboGame,
  source: string,
): GameLineup | null {
  const awayRaw = getNestedArray(value, [
    "result",
    "recordData",
    "battersBoxscore",
    "away",
  ]);
  const homeRaw = getNestedArray(value, [
    "result",
    "recordData",
    "battersBoxscore",
    "home",
  ]);
  const away = buildTeamLineup(game.awayTeam, awayRaw);
  const home = buildTeamLineup(game.homeTeam, homeRaw);

  return away || home ? { source, away, home } : null;
}

function extractLineupFromRelayData(
  value: unknown,
  game: KboGame,
  source: string,
): GameLineup | null {
  const awayRaw = getNestedArray(value, [
    "result",
    "textRelayData",
    "awayLineup",
    "batter",
  ]);
  const homeRaw = getNestedArray(value, [
    "result",
    "textRelayData",
    "homeLineup",
    "batter",
  ]);
  const away = buildTeamLineup(game.awayTeam, awayRaw);
  const home = buildTeamLineup(game.homeTeam, homeRaw);

  return away || home ? { source, away, home } : null;
}

function getFirstKboValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (!isRecord(value) || !Array.isArray(value.value)) {
    return null;
  }

  return value.value[0] ?? null;
}

function getKboLineupReady(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const lineupCheck = value.LINEUP_CK;

  return (
    lineupCheck === true ||
    getString(lineupCheck).toLowerCase() === "true" ||
    getNumber(lineupCheck) === 1
  );
}

function cleanKboCellText(value: unknown): string {
  const text =
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : getString(value);

  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseKboGridTable(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return isRecord(value) ? value : null;
}

function parseKboLineupTable(
  team: string,
  value: unknown,
): TeamLineup | null {
  const table = parseKboGridTable(value);
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const rawBatters = rows
    .flatMap((rowValue) => {
      if (!isRecord(rowValue) || !Array.isArray(rowValue.row)) {
        return [];
      }

      const cells = rowValue.row;
      const getCellText = (index: number) => {
        const cell = cells[index];

        if (!isRecord(cell)) {
          return "";
        }

        return cleanKboCellText(cell.Text ?? cell.text ?? cell.Value);
      };

      return {
        batOrder: getCellText(0),
        position: getCellText(1),
        name: getCellText(2),
        war: getCellText(3),
        starting: true,
      };
    });

  return buildTeamLineup(team, rawBatters);
}

async function fetchKboOfficialLineup(
  game: KboGame,
): Promise<GameLineup | null> {
  const gameId = game.gameId?.trim();
  const gameDate = game.gameDate.replace(/\D/g, "");

  if (!gameId || !gameDate) {
    return null;
  }

  const source = `${KBO_BASE_URL}/Schedule/GameCenter/Main.aspx?gameDate=${gameDate}&gameId=${encodeURIComponent(gameId)}&section=LINEUP`;
  const response = await fetch(KBO_LINEUP_ANALYSIS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: source,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({
      leId: "1",
      srId: "0",
      seasonId: gameDate.slice(0, 4),
      gameId,
    }),
    next: {
      revalidate: 60,
    },
  });

  if (!response.ok) {
    throw new Error("KBO official lineup lookup failed.");
  }

  const data = (await response.json()) as unknown;

  if (!Array.isArray(data)) {
    return null;
  }

  const lineupReady = getKboLineupReady(getFirstKboValue(data[0]));
  const homeAggregate = getFirstKboValue(data[1]);
  const awayAggregate = getFirstKboValue(data[2]);
  const homeTeam = isRecord(homeAggregate)
    ? getString(homeAggregate.T_NM) || game.homeTeam
    : game.homeTeam;
  const awayTeam = isRecord(awayAggregate)
    ? getString(awayAggregate.T_NM) || game.awayTeam
    : game.awayTeam;
  const home = parseKboLineupTable(homeTeam, getFirstKboValue(data[3]));
  const away = parseKboLineupTable(awayTeam, getFirstKboValue(data[4]));

  if (!lineupReady && !away && !home) {
    return null;
  }

  return away || home ? { source, away, home } : null;
}

async function fetchGameLineup(game: KboGame): Promise<GameLineup | null> {
  const naverGameId = toNaverGameId(game);

  if (!naverGameId) {
    return fetchKboOfficialLineup(game).catch(() => null);
  }

  const lineupPath = `/schedule/games/${naverGameId}/lineup`;
  const recordPath = `/schedule/games/${naverGameId}/record`;
  const relayPath = `/schedule/games/${naverGameId}/relay`;
  const [kboResult, lineupResult, recordResult, relayResult] =
    await Promise.allSettled([
      fetchKboOfficialLineup(game),
      fetchNaverJson<unknown>(lineupPath, naverGameId),
      fetchNaverJson<unknown>(recordPath, naverGameId),
      fetchNaverJson<unknown>(relayPath, naverGameId),
    ]);
  const kbo = kboResult.status === "fulfilled" ? kboResult.value : null;
  const lineup =
    lineupResult.status === "fulfilled"
      ? extractLineupFromLineupData(
          lineupResult.value,
          game,
          `${NAVER_SPORTS_API_BASE_URL}${lineupPath}`,
        )
      : null;
  const record =
    recordResult.status === "fulfilled"
      ? extractLineupFromRecordData(
          recordResult.value,
          game,
          `${NAVER_SPORTS_API_BASE_URL}${recordPath}`,
        )
      : null;
  const relay =
    relayResult.status === "fulfilled"
      ? extractLineupFromRelayData(
          relayResult.value,
          game,
          `${NAVER_SPORTS_API_BASE_URL}${relayPath}`,
        )
      : null;

  return kbo ?? lineup ?? record ?? relay;
}

function formatRate(value: number | null): string {
  return value === null ? "정보 없음" : value.toFixed(3);
}

function formatWar(value: number | null): string {
  return value === null ? "정보 없음" : value.toFixed(2);
}

function getLineupSummary(lineup: GameLineup | null): string[] {
  if (!lineup) {
    return [];
  }

  return [lineup.away, lineup.home]
    .filter((teamLineup): teamLineup is TeamLineup => Boolean(teamLineup))
    .map((teamLineup) => {
      const coreNames = teamLineup.batters
        .filter((batter) => batter.batOrder >= 3 && batter.batOrder <= 5)
        .map((batter) => batter.name)
        .join(", ");
      const primaryMetric =
        teamLineup.totalWar !== null
          ? `WAR 합산 ${formatWar(teamLineup.totalWar)}`
          : `라인업 평균 ${formatRate(teamLineup.averageBattingAverage)}`;
      const coreMetric =
        teamLineup.coreWar !== null
          ? `중심 WAR ${formatWar(teamLineup.coreWar)}`
          : `중심타율 ${formatRate(teamLineup.coreBattingAverage)}`;

      return `${teamLineup.team}: 선발 타자 ${teamLineup.starterCount}명, ${primaryMetric}, ${coreMetric}, 중심타선 ${coreNames || "정보 없음"}`;
    });
}

function buildTeamScore(input: {
  side: TeamSide;
  team: string;
  standing: KboStandingRow | null;
  opponentStanding: KboStandingRow | null;
  game: KboGame;
  lineup: TeamLineup | null;
  opponentLineup: TeamLineup | null;
}): TeamScore {
  const factors: string[] = [];
  let score = 50;

  if (input.standing && input.opponentStanding) {
    const winRateGap =
      parseWinningRate(input.standing.winningRate) -
      parseWinningRate(input.opponentStanding.winningRate);
    const rankGap = input.opponentStanding.rank - input.standing.rank;
    const lastTen = parseLastTenRecord(input.standing.lastTenGames);
    const opponentLastTen = parseLastTenRecord(
      input.opponentStanding.lastTenGames,
    );
    const formGap =
      lastTen.wins -
      lastTen.losses -
      (opponentLastTen.wins - opponentLastTen.losses);
    const streakGap =
      getStreakScore(input.standing.streak) -
      getStreakScore(input.opponentStanding.streak);

    score += winRateGap * 85;
    score += rankGap * 1.7;
    score += formGap * 1.2;
    score += streakGap * 0.8;

    if (rankGap > 0) {
      factors.push(`${input.team}이 순위에서 우위입니다.`);
    }

    if (winRateGap > 0.02) {
      factors.push(`${input.team}의 시즌 승률이 더 높습니다.`);
    }

    if (formGap > 1) {
      factors.push(`${input.team}의 최근 10경기 흐름이 더 좋습니다.`);
    }

    if (streakGap > 1) {
      factors.push(`${input.team}의 연승/연패 흐름이 더 유리합니다.`);
    }
  }

  if (input.side === "home") {
    score += 2.5;

    if (input.standing) {
      const homeRate = getRecordRate(parseRecord(input.standing.homeRecord));
      const awayRate = input.opponentStanding
        ? getRecordRate(parseRecord(input.opponentStanding.awayRecord))
        : 0.5;

      score += (homeRate - awayRate) * 8;
    }

    factors.push(`${input.team}은 홈 경기 이점이 있습니다.`);
  } else if (input.standing && input.opponentStanding) {
    const awayRate = getRecordRate(parseRecord(input.standing.awayRecord));
    const homeRate = getRecordRate(parseRecord(input.opponentStanding.homeRecord));

    score += (awayRate - homeRate) * 8;
  }

  const startingPitcher =
    input.side === "away"
      ? input.game.awayStartingPitcher
      : input.game.homeStartingPitcher;

  if (startingPitcher) {
    score += 1.5;
    factors.push(`${input.team} 선발 ${startingPitcher.name} 정보가 확인됩니다.`);
  }

  if (input.lineup && input.opponentLineup) {
    const lineupEdge = clamp(
      input.lineup.strength - input.opponentLineup.strength,
      -6,
      6,
    );

    score += lineupEdge;

    if (lineupEdge > 1.5) {
      factors.push(
        `${input.team}의 타자 라인업 지표가 상대보다 좋습니다.`,
      );
    }

    if (
      input.lineup.totalWar !== null &&
      input.opponentLineup.totalWar !== null &&
      input.lineup.totalWar - input.opponentLineup.totalWar > 1.5
    ) {
      factors.push(
        `${input.team}의 선발 타자 WAR 합산이 상대보다 높습니다.`,
      );
    }

    if (
      input.lineup.coreBattingAverage !== null &&
      input.opponentLineup.coreBattingAverage !== null &&
      input.lineup.coreBattingAverage - input.opponentLineup.coreBattingAverage >
        0.02
    ) {
      factors.push(
        `${input.team} 중심타선의 타율 지표가 더 높습니다.`,
      );
    }
  } else if (input.lineup) {
    score += 1;
    factors.push(`${input.team} 타자 라인업 정보가 확인됩니다.`);
  }

  if (
    input.game.status === "live" &&
    input.game.awayScore !== null &&
    input.game.homeScore !== null
  ) {
    const scoreGap =
      input.side === "away"
        ? input.game.awayScore - input.game.homeScore
        : input.game.homeScore - input.game.awayScore;

    score += scoreGap * 6;

    if (scoreGap > 0) {
      factors.push(`${input.team}이 현재 스코어에서 앞서고 있습니다.`);
    }
  }

  return {
    side: input.side,
    team: input.team,
    score,
    standing: input.standing,
    lineup: input.lineup,
    factors,
  };
}

function getConfidence(probability: number): "낮음" | "보통" | "높음" {
  const edge = Math.abs(probability - 50);

  if (edge >= 18) {
    return "높음";
  }

  if (edge >= 9) {
    return "보통";
  }

  return "낮음";
}

function buildFallbackSummary(input: {
  predictedTeam: string;
  confidence: GamePredictionResult["confidence"];
  awayProbability: number;
  homeProbability: number;
  game: KboGame;
}): string {
  return [
    `${input.game.awayTeam} ${input.awayProbability}% : ${input.homeProbability}% ${input.game.homeTeam}로 계산되었습니다.`,
    `현재 데이터 기준으로는 ${input.predictedTeam} 쪽 가능성이 조금 더 높습니다.`,
    `신뢰도는 ${input.confidence}이며, 경기 전 변수와 라인업 변화에 따라 달라질 수 있습니다.`,
  ].join("\n");
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

async function generatePredictionSummary(input: {
  game: KboGame;
  awayScore: TeamScore;
  homeScore: TeamScore;
  predictedTeam: string;
  confidence: GamePredictionResult["confidence"];
  awayProbability: number;
  homeProbability: number;
  factors: string[];
  lineupSummary: string[];
}): Promise<string | null> {
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return null;
  }

  const prompt = [
    "너는 야구 커뮤니티의 승부 예측 코멘트를 작성하는 AI다.",
    "제공된 KBO 순위/경기 데이터와 계산 결과만 근거로 사용해라.",
    "도박이나 확정 표현처럼 보이지 않게, 팬 관전 포인트 중심으로 써라.",
    "한국어로 4~5문장만 작성해라.",
    "",
    `[경기] ${input.game.gameDate} ${input.game.awayTeam} vs ${input.game.homeTeam}`,
    `[상태] ${input.game.status}`,
    `[스코어] ${input.game.awayScore ?? "-"}:${input.game.homeScore ?? "-"}`,
    `[예측] ${input.predictedTeam}`,
    `[확률] ${input.game.awayTeam} ${input.awayProbability}% / ${input.game.homeTeam} ${input.homeProbability}%`,
    `[신뢰도] ${input.confidence}`,
    "[원정팀 데이터]",
    JSON.stringify(input.awayScore, null, 2),
    "[홈팀 데이터]",
    JSON.stringify(input.homeScore, null, 2),
    "[핵심 근거]",
    input.factors.join("\n"),
    "[라인업 반영]",
    input.lineupSummary.length > 0
      ? input.lineupSummary.join("\n")
      : "라인업 정보 없음",
  ].join("\n");

  try {
    const chat = new ChatOpenAI({
      apiKey,
      model: getChatModel(),
      temperature: 0.25,
    });
    const response = await chat.invoke(prompt);

    return getMessageText(response.content) || null;
  } catch (error) {
    console.error("Failed to generate game prediction summary.", error);

    return null;
  }
}

function prioritizePredictionFactors(factors: string[]): string[] {
  const uniqueFactors = [...new Set(factors)];
  const lineupFactors = uniqueFactors.filter(
    (factor) =>
      factor.includes("라인업") ||
      factor.includes("WAR") ||
      factor.includes("중심타선") ||
      factor.includes("타율"),
  );
  const otherFactors = uniqueFactors.filter(
    (factor) => !lineupFactors.includes(factor),
  );

  return [...lineupFactors, ...otherFactors].slice(0, 6);
}

export async function createGamePrediction({
  game,
}: PredictionInput): Promise<GamePredictionResult> {
  const [standings, lineup] = await Promise.all([
    fetchKboStandings(),
    fetchGameLineup(game).catch(() => null),
  ]);
  const awayStanding = findStanding(standings.rows, game.awayTeam);
  const homeStanding = findStanding(standings.rows, game.homeTeam);
  const lineupSummary = getLineupSummary(lineup);
  const awayScore = buildTeamScore({
    side: "away",
    team: game.awayTeam,
    standing: awayStanding,
    opponentStanding: homeStanding,
    game,
    lineup: lineup?.away ?? null,
    opponentLineup: lineup?.home ?? null,
  });
  const homeScore = buildTeamScore({
    side: "home",
    team: game.homeTeam,
    standing: homeStanding,
    opponentStanding: awayStanding,
    game,
    lineup: lineup?.home ?? null,
    opponentLineup: lineup?.away ?? null,
  });
  const totalScore = awayScore.score + homeScore.score;
  const awayProbability =
    totalScore > 0 ? Math.round((awayScore.score / totalScore) * 100) : 50;
  const clampedAwayProbability = clamp(awayProbability, 5, 95);
  const homeProbability = 100 - clampedAwayProbability;
  const predictedTeam =
    clampedAwayProbability >= homeProbability ? game.awayTeam : game.homeTeam;
  const confidence = getConfidence(
    predictedTeam === game.awayTeam
      ? clampedAwayProbability
      : homeProbability,
  );
  const factors = prioritizePredictionFactors([
    ...awayScore.factors,
    ...homeScore.factors,
  ]);
  const caveats = [
    "승부 예측은 참고용이며 실제 결과를 보장하지 않습니다.",
    lineupSummary.length > 0
      ? "라인업은 확인된 데이터만 반영했으며, 경기 직전 교체나 컨디션 변수는 반영되지 않을 수 있습니다."
      : "타자 라인업이 아직 공개되지 않았다면 라인업 보정은 적용되지 않습니다.",
    "불펜 소모, 부상, 날씨 같은 변수는 실시간으로 반영되지 않을 수 있습니다.",
  ];
  const fallbackSummary = buildFallbackSummary({
    predictedTeam,
    confidence,
    awayProbability: clampedAwayProbability,
    homeProbability,
    game,
  });
  const llmSummary = await generatePredictionSummary({
    game,
    awayScore,
    homeScore,
    predictedTeam,
    confidence,
    awayProbability: clampedAwayProbability,
    homeProbability,
    factors,
    lineupSummary,
  });

  return {
    predictedTeam,
    confidence,
    awayWinProbability: clampedAwayProbability,
    homeWinProbability: homeProbability,
    summary: llmSummary ?? fallbackSummary,
    factors:
      factors.length > 0
        ? factors
        : ["양 팀 전력이 비슷해 보이며, 경기 당일 변수가 중요합니다."],
    caveats,
    lineupApplied: lineupSummary.length > 0,
    lineupSummary,
    modelUsed: Boolean(llmSummary),
    standingsSource: standings.source,
  };
}

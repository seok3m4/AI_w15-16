import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_AUTHOR = {
  email: "demo-reviewer@kbotalk.local",
  nickname: "경기리뷰러",
  passwordHash: "demo-seed-user-not-for-login",
};

const TARGET_POST_COUNT = 15;
const LOOKBACK_MONTHS = 3;
const KBO_BASE_URL = "https://www.koreabaseball.com";
const KBO_SCHEDULE_URL = `${KBO_BASE_URL}/Schedule/Schedule.aspx`;
const KBO_SCHEDULE_LIST_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetScheduleList`;
const KBO_SCORE_BOARD_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetScoreBoardScroll`;
const KBO_BOX_SCORE_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetBoxScoreScroll`;
const KBO_REGULAR_SEASON_IDS = "0,9,6";
const NAVER_NEWS_SEARCH_URL = "https://search.naver.com/search.naver";
const NEWS_ARTICLE_LIMIT = 5;
const NEWS_FETCH_ITEM_LIMIT = 15;
const EXTERNAL_REQUEST_TIMEOUT_MS = 15_000;
const NAVER_NEWS_REQUEST_DELAY_MS = 900;
const EXCLUDED_NEWS_KEYWORDS = [
  "치어리더",
  "프리뷰",
  "라인업",
  "예고",
  "날씨",
  "티켓",
  "대표팀",
  "드래프트",
  "AI상보",
  "AI프리뷰",
];

function loadEnvValue(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return;
  }

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex === -1) {
    return;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  if (key && !process.env[key]) {
    process.env[key] = value;
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadEnvFile() {
  try {
    const envText = await readFile(resolve(process.cwd(), ".env"), "utf8");
    envText.split(/\r?\n/).forEach(loadEnvValue);
  } catch {
    // DATABASE_URL can also be provided directly by the shell.
  }
}

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function stripHtml(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value = "") {
  return stripHtml(decodeXml(String(value))).replace(/^&nbsp;$/, "").trim();
}

function hasFinalConsonant(value = "") {
  const chars = [...String(value).trim()];
  const lastChar = chars.at(-1);

  if (!lastChar) {
    return false;
  }

  const code = lastChar.charCodeAt(0);

  if (code < 0xac00 || code > 0xd7a3) {
    return false;
  }

  return (code - 0xac00) % 28 !== 0;
}

function topic(value) {
  return `${value}${hasFinalConsonant(value) ? "은" : "는"}`;
}

function subject(value) {
  return `${value}${hasFinalConsonant(value) ? "이" : "가"}`;
}

function object(value) {
  return `${value}${hasFinalConsonant(value) ? "을" : "를"}`;
}

function getCellText(cell) {
  return cleanText(cell?.Text ?? "");
}

function extractKboLink(html = "") {
  const match = html.match(/href=["']([^"']+)["']/i);

  if (!match) {
    return null;
  }

  return new URL(decodeXml(match[1]), KBO_BASE_URL).toString();
}

function extractKboGameId(url) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).searchParams.get("gameId");
  } catch {
    return null;
  }
}

function parseKboDisplayDate(displayDate, seasonId) {
  const match = displayDate.match(/^(\d{2})\.(\d{2})/);

  if (!match) {
    return null;
  }

  return `${seasonId}-${match[1]}-${match[2]}`;
}

function parseKboPlayCell(playHtml = "") {
  const match = playHtml.match(
    /<span[^>]*>([^<]+)<\/span>\s*<em>([\s\S]*?)<\/em>\s*<span[^>]*>([^<]+)<\/span>/i,
  );

  if (!match) {
    return null;
  }

  const [, awayTeamRaw, scoreHtml, homeTeamRaw] = match;
  const scoreParts = [...scoreHtml.matchAll(/<span[^>]*>([^<]+)<\/span>/gi)]
    .map((scoreMatch) => cleanText(scoreMatch[1]))
    .filter((part) => /^\d+$/.test(part));
  const awayScore = scoreParts[0] ? Number(scoreParts[0]) : null;
  const homeScore = scoreParts[1] ? Number(scoreParts[1]) : null;

  return {
    awayTeam: cleanText(awayTeamRaw),
    homeTeam: cleanText(homeTeamRaw),
    awayScore,
    homeScore,
  };
}

function parseKboScheduleRows(rows, seasonId) {
  const games = [];
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
    const play = parseKboPlayCell(cells[offset + 1]?.Text ?? "");
    const reviewUrl = extractKboLink(cells[offset + 2]?.Text ?? "");
    const highlightUrl = extractKboLink(cells[offset + 3]?.Text ?? "");

    if (!currentGameDate || !time || !play) {
      continue;
    }

    const isPregameScore =
      play.awayScore === 0 &&
      play.homeScore === 0 &&
      reviewUrl === null &&
      highlightUrl === null;

    if (isPregameScore || play.awayScore === null || play.homeScore === null) {
      continue;
    }

    games.push({
      gameDate: currentGameDate,
      displayDate: currentDisplayDate,
      time,
      awayTeam: play.awayTeam,
      homeTeam: play.homeTeam,
      awayScore: play.awayScore,
      homeScore: play.homeScore,
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

async function fetchKboMonthlyGames(year, month) {
  const body = new URLSearchParams({
    leId: "1",
    srIdList: KBO_REGULAR_SEASON_IDS,
    seasonId: String(year),
    gameMonth: String(month).padStart(2, "0"),
    teamId: "",
  });

  const response = await fetch(KBO_SCHEDULE_LIST_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: KBO_SCHEDULE_URL,
      "User-Agent": "BaseballAIBoard/0.1 demo seed crawler",
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
    signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`KBO request failed with status ${response.status}.`);
  }

  const data = await response.json();

  return parseKboScheduleRows(data.rows ?? [], String(year));
}

function getKstYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "2026"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
  };
}

function addMonths(year, month, offset) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

function getGameKey(game) {
  return [
    game.gameDate,
    game.time,
    game.awayTeam,
    game.homeTeam,
    game.awayScore,
    game.homeScore,
  ].join(":");
}

async function fetchRecentCompletedGames() {
  const base = getKstYearMonth();
  const games = [];
  const seen = new Set();

  for (let offset = 0; offset > -LOOKBACK_MONTHS; offset -= 1) {
    const target = addMonths(base.year, base.month, offset);

    try {
      const monthlyGames = await fetchKboMonthlyGames(target.year, target.month);

      for (const game of monthlyGames) {
        const key = getGameKey(game);

        if (!seen.has(key)) {
          seen.add(key);
          games.push(game);
        }
      }
    } catch (error) {
      console.warn(
        `Skip ${target.year}-${String(target.month).padStart(2, "0")}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (games.length >= TARGET_POST_COUNT) {
      break;
    }
  }

  return games
    .sort((a, b) => {
      const dateOrder = b.gameDate.localeCompare(a.gameDate);

      if (dateOrder !== 0) {
        return dateOrder;
      }

      return b.time.localeCompare(a.time);
    })
    .slice(0, TARGET_POST_COUNT);
}

function parseTableJson(tableText) {
  if (!tableText) {
    return { headers: [], rows: [], tfoot: [] };
  }

  try {
    return JSON.parse(tableText);
  } catch {
    return { headers: [], rows: [], tfoot: [] };
  }
}

function getTableRows(tableText) {
  const table = parseTableJson(tableText);

  return (table.rows ?? []).map((row) =>
    (row.row ?? []).map((cell) => cleanText(cell.Text ?? "")),
  );
}

function stripTrailingNewsSource(title, source) {
  if (!source) {
    return title;
  }

  return title.replace(new RegExp(`\\s+-\\s+${source}$`), "").trim();
}

function normalizeArticleTitle(title) {
  return title
    .replace(/\s+([,.;:!?…])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeNewsTitle(title) {
  return title
    .replace(/\[[^\]]+\]/g, "")
    .replace(/["'‘’“”`.,…:!?\s]/g, "")
    .slice(0, 80);
}

function parseNaverNewsItems(html) {
  const articles = [];
  const titlePattern =
    /<a[^>]+href="([^"]+)"[^>]+data-heatmap-target="\.tit"[^>]*>\s*<span[^>]*class="[^"]*sds-comps-text-type-headline1[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<\/a>/g;
  let match;

  while ((match = titlePattern.exec(html)) && articles.length < NEWS_FETCH_ITEM_LIMIT) {
    const [, url, rawTitle] = match;
    const before = html.slice(Math.max(0, match.index - 2500), match.index);
    const after = html.slice(match.index, match.index + 2500);
    const sourceMatches = [
      ...before.matchAll(
        /sds-comps-profile-info-title-text[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g,
      ),
    ];
    const summaryMatch = after.match(
      /data-heatmap-target="\.body"[^>]*>\s*<span[^>]*class="[^"]*sds-comps-text-type-body1[^"]*"[^>]*>([\s\S]*?)<\/span>/,
    );
    const source = cleanText(sourceMatches.at(-1)?.[1] ?? "네이버뉴스");
    const title = normalizeArticleTitle(cleanText(rawTitle));
    const summary = cleanText(summaryMatch?.[1] ?? "");

    if (title && url) {
      articles.push({
        title: stripTrailingNewsSource(title, source),
        summary,
        url: decodeXml(url),
        source,
        publishedAt: null,
      });
    }
  }

  return articles;
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function parseScoreSummary(scoreBoard, game) {
  const inningHeaders = (parseTableJson(scoreBoard.table2).headers?.[0]?.row ?? [])
    .map((cell) => cleanText(cell.Text ?? ""))
    .filter(Boolean);
  const inningRows = getTableRows(scoreBoard.table2);
  const totalRows = getTableRows(scoreBoard.table3);
  const toInningRuns = (row) =>
    inningHeaders.map((inning, index) => ({
      inning,
      runs: toNumber(row?.[index]),
    }));

  return {
    away: {
      team: game.awayTeam,
      innings: toInningRuns(inningRows[0] ?? []),
      runs: toNumber(totalRows[0]?.[0] ?? game.awayScore),
      hits: toNumber(totalRows[0]?.[1]),
      errors: toNumber(totalRows[0]?.[2]),
      walks: toNumber(totalRows[0]?.[3]),
    },
    home: {
      team: game.homeTeam,
      innings: toInningRuns(inningRows[1] ?? []),
      runs: toNumber(totalRows[1]?.[0] ?? game.homeScore),
      hits: toNumber(totalRows[1]?.[1]),
      errors: toNumber(totalRows[1]?.[2]),
      walks: toNumber(totalRows[1]?.[3]),
    },
  };
}

function parseEtcRecords(tableEtc) {
  return Object.fromEntries(
    getTableRows(tableEtc)
      .filter((row) => row.length >= 2 && row[0] && row[1])
      .map((row) => [row[0], row[1]]),
  );
}

function parseHitterTeam(hitterRecord, team) {
  if (!hitterRecord) {
    return [];
  }

  const lineupRows = getTableRows(hitterRecord.table1);
  const statRows = getTableRows(hitterRecord.table3);

  return lineupRows
    .map((row, index) => {
      const stat = statRows[index] ?? [];

      return {
        team,
        order: row[0] ?? "",
        position: row[1] ?? "",
        name: row[2] ?? "",
        atBats: toNumber(stat[0]),
        hits: toNumber(stat[1]),
        rbi: toNumber(stat[2]),
        runs: toNumber(stat[3]),
        avg: stat[4] ?? "",
      };
    })
    .filter((player) => player.name);
}

function parsePitcherTeam(pitcherRecord, team) {
  if (!pitcherRecord) {
    return [];
  }

  return getTableRows(pitcherRecord.table)
    .map((row) => ({
      team,
      name: row[0] ?? "",
      appearance: row[1] ?? "",
      result: row[2] ?? "",
      wins: row[3] ?? "",
      losses: row[4] ?? "",
      saves: row[5] ?? "",
      innings: row[6] ?? "",
      batters: row[7] ?? "",
      pitches: row[8] ?? "",
      atBats: row[9] ?? "",
      hitsAllowed: row[10] ?? "",
      homeRunsAllowed: row[11] ?? "",
      walks: row[12] ?? "",
      strikeouts: row[13] ?? "",
      runs: row[14] ?? "",
      earnedRuns: row[15] ?? "",
      era: row[16] ?? "",
    }))
    .filter((player) => player.name);
}

function getGameCenterReferer(game) {
  const seasonId = game.gameDate.slice(0, 4);

  return `${KBO_BASE_URL}/Schedule/GameCenter/ReviewNew.aspx?leId=1&srId=0&seasonId=${seasonId}&gameId=${game.gameId}`;
}

async function fetchKboGameCenterJson(url, game) {
  const seasonId = game.gameDate.slice(0, 4);
  const body = new URLSearchParams({
    leId: "1",
    srId: "0",
    seasonId,
    gameId: game.gameId,
  });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: getGameCenterReferer(game),
      "User-Agent": "BaseballAIBoard/0.1 demo seed crawler",
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
    signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`KBO game detail request failed with status ${response.status}.`);
  }

  return response.json();
}

function pickTopHitters(hitters, winner) {
  return hitters
    .filter((player) => player.hits > 0 || player.rbi > 0 || player.runs > 0)
    .sort((a, b) => {
      const winnerOrder =
        Number(a.team !== winner) - Number(b.team !== winner);

      if (winnerOrder !== 0) {
        return winnerOrder;
      }

      return (
        b.rbi - a.rbi ||
        b.hits - a.hits ||
        b.runs - a.runs ||
        a.name.localeCompare(b.name)
      );
    })
    .slice(0, 4);
}

async function fetchKboGameDetails(game) {
  if (!game.gameId) {
    return null;
  }

  const [scoreBoard, boxScore] = await Promise.all([
    fetchKboGameCenterJson(KBO_SCORE_BOARD_URL, game),
    fetchKboGameCenterJson(KBO_BOX_SCORE_URL, game),
  ]);
  const etc = parseEtcRecords(boxScore.tableEtc);
  const hitters = [
    ...parseHitterTeam(boxScore.arrHitter?.[0], game.awayTeam),
    ...parseHitterTeam(boxScore.arrHitter?.[1], game.homeTeam),
  ];
  const pitchers = [
    ...parsePitcherTeam(boxScore.arrPitcher?.[0], game.awayTeam),
    ...parsePitcherTeam(boxScore.arrPitcher?.[1], game.homeTeam),
  ];
  const result = getGameResult(game);
  const winner = result.type === "win" ? result.winner : "";

  return {
    scoreBoard,
    scoreSummary: parseScoreSummary(scoreBoard, game),
    etc,
    hitters,
    pitchers,
    topHitters: pickTopHitters(hitters, winner),
    winningPitcher: pitchers.find((pitcher) => pitcher.result === "승") ?? null,
    losingPitcher: pitchers.find((pitcher) => pitcher.result === "패") ?? null,
    savePitcher: pitchers.find((pitcher) => pitcher.result === "세") ?? null,
  };
}

function extractPlayerName(recordText) {
  return recordText?.split("(")[0]?.trim() ?? "";
}

function getGameNewsQueries(game) {
  const result = getGameResult(game);
  const topHitter = game.details?.topHitters?.[0]?.name ?? "";
  const winningPitcher = game.details?.winningPitcher?.name ?? "";

  if (result.type === "win") {
    return [
      `${result.winner} ${result.loser} ${result.winnerScore}-${result.loserScore} KBO`,
      `${result.winner} ${result.loser} ${topHitter} ${winningPitcher} 프로야구`,
    ].filter((query) => query.trim().length > 0);
  }

  return [
    `${game.awayTeam} ${game.homeTeam} ${game.awayScore}-${game.homeScore} 프로야구`,
  ];
}

function includesAny(value, keywords) {
  return keywords.some((keyword) => keyword && value.includes(keyword));
}

function scoreNewsArticle(article, game) {
  const result = getGameResult(game);
  const searchableText = `${article.title} ${article.summary ?? ""}`;
  const scoreText1 = `${game.awayScore}-${game.homeScore}`;
  const scoreText2 = `${game.homeScore}-${game.awayScore}`;
  const winningHitPlayer = extractPlayerName(game.details?.etc?.결승타);
  const keyPlayers = [
    winningHitPlayer,
    game.details?.topHitters?.[0]?.name,
    game.details?.topHitters?.[1]?.name,
    game.details?.winningPitcher?.name,
    game.details?.savePitcher?.name,
  ].filter(Boolean);
  let score = 0;

  if (searchableText.includes(game.awayTeam) && searchableText.includes(game.homeTeam)) {
    score += 5;
  } else if (searchableText.includes(game.awayTeam) || searchableText.includes(game.homeTeam)) {
    score += 2;
  }

  if (searchableText.includes(scoreText1) || searchableText.includes(scoreText2)) {
    score += 4;
  }

  if (result.type === "win") {
    if (searchableText.includes(result.winner)) {
      score += 2;
    }

    if (searchableText.includes(result.loser)) {
      score += 2;
    }
  }

  if (includesAny(searchableText, keyPlayers)) {
    score += 3;
  }

  if (includesAny(searchableText, ["KBO", "프로야구", "승리", "대파", "완파", "연승", "싹쓸이", "결승타"])) {
    score += 1;
  }

  if (includesAny(searchableText, EXCLUDED_NEWS_KEYWORDS)) {
    score -= 8;
  }

  return score;
}

async function fetchNewsByQuery(query) {
  const url = new URL(NAVER_NEWS_SEARCH_URL);

  url.searchParams.set("where", "news");
  url.searchParams.set("query", query);
  url.searchParams.set("sort", "0");
  url.searchParams.set("sm", "tab_opt");

  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
    },
    signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Naver News request failed with status ${response.status}.`);
  }

  return parseNaverNewsItems(await response.text());
}

async function fetchGameNewsArticles(game) {
  const candidates = [];
  const seen = new Set();

  for (const query of getGameNewsQueries(game)) {
    try {
      await delay(NAVER_NEWS_REQUEST_DELAY_MS);
      const articles = await fetchNewsByQuery(query);

      for (const article of articles) {
        const key = normalizeNewsTitle(article.title);

        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({
            ...article,
            score: scoreNewsArticle(article, game),
          });
        }
      }
    } catch (error) {
      console.warn(
        `Skip news query "${query}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const sortedCandidates = candidates.sort((a, b) => b.score - a.score);
  const selected = sortedCandidates
    .filter((article) => article.score > 0)
    .slice(0, NEWS_ARTICLE_LIMIT);

  if (selected.length < NEWS_ARTICLE_LIMIT) {
    for (const article of sortedCandidates) {
      if (selected.length >= NEWS_ARTICLE_LIMIT) {
        break;
      }

      if (
        !selected.some(
          (selectedArticle) =>
            normalizeNewsTitle(selectedArticle.title) ===
            normalizeNewsTitle(article.title),
        )
      ) {
        selected.push(article);
      }
    }
  }

  return selected.slice(0, NEWS_ARTICLE_LIMIT).map((article) => ({
    title: article.title,
    summary: article.summary,
    url: article.url,
    source: article.source,
    publishedAt: article.publishedAt,
  }));
}

function getGameResult(game) {
  if (game.awayScore === game.homeScore) {
    return {
      type: "draw",
      scoreLine: `${game.awayTeam} ${game.awayScore} : ${game.homeScore} ${game.homeTeam}`,
      titleTeam: `${game.awayTeam}-${game.homeTeam}`,
    };
  }

  const awayWon = game.awayScore > game.homeScore;
  const winner = awayWon ? game.awayTeam : game.homeTeam;
  const loser = awayWon ? game.homeTeam : game.awayTeam;
  const winnerScore = awayWon ? game.awayScore : game.homeScore;
  const loserScore = awayWon ? game.homeScore : game.awayScore;

  return {
    type: "win",
    winner,
    loser,
    winnerScore,
    loserScore,
    margin: Math.abs(game.awayScore - game.homeScore),
    scoreLine: `${game.awayTeam} ${game.awayScore} : ${game.homeScore} ${game.homeTeam}`,
    titleTeam: winner,
  };
}

function buildTitle(game) {
  return `${game.gameDate} ${game.awayTeam} VS ${game.homeTeam} 리뷰`;
}

function buildFlowParagraph(game) {
  const result = getGameResult(game);

  if (result.type === "draw") {
    return `${game.awayTeam}와 ${game.homeTeam} 모두 흐름을 완전히 가져오지 못한 경기였다. 스코어가 동률로 끝난 만큼 선발 이후 불펜 운영, 찬스에서의 한 방, 수비 집중력이 동시에 중요하게 보였다.`;
  }

  if (result.margin <= 2) {
    return `${result.winner}는 큰 점수 차를 만들기보다 필요한 순간에 점수를 쌓고 마지막까지 리드를 지킨 쪽에 가까웠다. ${result.loser}도 경기 흐름에서 완전히 밀리지는 않았지만, 접전 구간의 한두 장면이 최종 스코어를 갈랐다.`;
  }

  if (result.margin >= 5) {
    return `${result.winner}는 초중반부터 점수 차를 벌리며 경기 운영을 편하게 만들었다. 반대로 ${result.loser}는 추격 흐름을 만들기 전에 실점 부담이 커졌고, 투수 교체와 공격 루트 모두 어려운 방향으로 흘렀다.`;
  }

  return `${result.winner}는 경기 중반 이후 흐름을 잡으면서 승리까지 연결했다. ${result.loser} 입장에서는 따라갈 수 있는 구간이 있었지만, 추가 실점이나 찬스 무산이 겹치며 분위기를 바꾸지 못했다.`;
}

function getScoringEvents(game) {
  const summary = game.details?.scoreSummary;

  if (!summary) {
    return [];
  }

  return [
    ...summary.away.innings.map((inning) => ({
      team: summary.away.team,
      inning: inning.inning,
      half: "초",
      runs: inning.runs,
    })),
    ...summary.home.innings.map((inning) => ({
      team: summary.home.team,
      inning: inning.inning,
      half: "말",
      runs: inning.runs,
    })),
  ]
    .filter((event) => event.runs > 0)
    .sort((a, b) => {
      const inningOrder = toNumber(a.inning) - toNumber(b.inning);

      if (inningOrder !== 0) {
        return inningOrder;
      }

      return a.half === "초" ? -1 : 1;
    });
}

function formatScoringAction(event) {
  return `${event.inning}회${event.half} ${subject(event.team)} ${event.runs}점을 냈다`;
}

function formatScoringListItem(event) {
  return `${event.inning}회${event.half} ${event.runs}점`;
}

function getNewsSignals(game) {
  const articles = game.details?.newsArticles ?? [];
  const headlineText = articles
    .map((article) => `${article.title} ${article.summary ?? ""}`)
    .join(" ");

  return {
    sweep: headlineText.includes("싹쓸이") || headlineText.includes("스윕"),
    blowout:
      headlineText.includes("대파") ||
      headlineText.includes("완파") ||
      headlineText.includes("대승"),
    winningStreak: headlineText.includes("연승"),
    lead:
      headlineText.includes("단독 선두") ||
      headlineText.includes("선두") ||
      headlineText.includes("1위"),
    comeback: headlineText.includes("역전"),
    shutoutPitching: headlineText.includes("무실점"),
  };
}

function joinKoreanList(items) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]}와 ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, 그리고 ${items.at(-1)}`;
}

function buildNewsLeadParagraph(game) {
  const result = getGameResult(game);
  const signals = getNewsSignals(game);
  const topHitters = game.details?.topHitters ?? [];
  const winningPitcher = game.details?.winningPitcher;
  const playerSentences = [];
  const meaningParts = [];
  let resultSentence = "";

  if (result.type === "draw") {
    resultSentence = `${game.awayTeam}와 ${topic(
      game.homeTeam,
    )} ${result.scoreLine} 무승부로 경기를 마쳤다.`;
  } else {
    const scoreTone = signals.blowout ? "크게 꺾었다" : "이겼다";

    resultSentence = `${topic(result.winner)} ${
      game.stadium ? `${game.stadium}에서 ` : ""
    }${object(result.loser)} ${result.winnerScore}-${result.loserScore}로 ${scoreTone}.`;
  }

  if (signals.sweep) {
    meaningParts.push("시리즈 싹쓸이");
  }

  if (signals.winningStreak) {
    meaningParts.push("연승 흐름");
  }

  if (signals.lead) {
    meaningParts.push("선두권 경쟁에서의 분위기");
  }

  if (signals.comeback) {
    meaningParts.push("승부처 집중력");
  }

  if (topHitters[0]) {
    playerSentences.push(
      `${subject(topHitters[0].name)} ${topHitters[0].hits}안타 ${topHitters[0].rbi}타점으로 타선을 끌었다`,
    );
  }

  if (topHitters[1]) {
    playerSentences.push(
      `${topHitters[1].name}도 ${topHitters[1].hits}안타 ${topHitters[1].rbi}타점으로 뒤를 받쳤다`,
    );
  }

  if (winningPitcher) {
    const runText =
      winningPitcher.runs === "0"
        ? "무실점"
        : `${winningPitcher.runs}실점`;

    playerSentences.push(
      `${topic(winningPitcher.name)} ${winningPitcher.innings}이닝 ${runText}으로 마운드 흐름을 잡았다`,
    );
  }

  const meaningSentence =
    meaningParts.length > 0
      ? `이날 승리는 단순한 1승을 넘어 ${joinKoreanList(
          meaningParts,
        )}까지 챙긴 경기였다.`
      : "";
  const playerSentence =
    playerSentences.length > 0 ? `${playerSentences.join(". ")}.` : "";

  return [resultSentence, meaningSentence, playerSentence]
    .filter(Boolean)
    .join(" ");
}

function buildGameFlowParagraph(game) {
  const result = getGameResult(game);
  const events = getScoringEvents(game);

  if (events.length === 0) {
    return buildFlowParagraph(game);
  }

  const firstEvent = events[0];
  const biggestEvent = [...events].sort((a, b) => b.runs - a.runs)[0];
  const winnerEvents =
    result.type === "win"
      ? events.filter((event) => event.team === result.winner)
      : events;
  const loserEvents =
    result.type === "win"
      ? events.filter((event) => event.team === result.loser)
      : [];
  const sentences = [
    `${formatScoringAction(firstEvent)}. 이 장면부터 경기 흐름이 움직이기 시작했다.`,
  ];

  if (biggestEvent && biggestEvent.runs >= 3) {
    sentences.push(
      `${biggestEvent.inning}회${biggestEvent.half} ${subject(
        biggestEvent.team,
      )} ${biggestEvent.runs}점을 몰아낸 것이 가장 큰 분기점이었다. 이 이닝 이후 경기의 무게가 ${biggestEvent.team} 쪽으로 확실히 기울었다.`,
    );
  }

  if (result.type === "win" && winnerEvents.length >= 2) {
    sentences.push(
      `${topic(result.winner)} ${winnerEvents
        .slice(0, 4)
        .map(formatScoringListItem)
        .join(", ")}처럼 여러 이닝에서 점수를 쌓으며 상대 마운드를 계속 압박했다.`,
    );
  }

  if (result.type === "win" && loserEvents.length > 0) {
    sentences.push(
      `${result.loser}도 ${loserEvents
        .slice(0, 3)
        .map(formatScoringListItem)
        .join(", ")}으로 반응했지만, 흐름을 다시 가져오기에는 득점 간격이 너무 벌어졌다.`,
    );
  } else if (result.type === "win") {
    sentences.push(
      `${topic(result.loser)} 득점 루트를 거의 만들지 못하면서 추격 분위기를 이어가지 못했다.`,
    );
  }

  return sentences.join(" ");
}

function buildRecordParagraph(game) {
  const details = game.details;
  const records = details?.etc ?? {};
  const pieces = [];

  if (records.결승타) {
    pieces.push(`결승타는 ${records.결승타}였다`);
  }

  if (records.홈런) {
    pieces.push(`홈런은 ${records.홈런}이 기록했다`);
  }

  if (records["2루타"]) {
    pieces.push(`2루타는 ${records["2루타"]}에서 나왔다`);
  }

  if (records.도루) {
    pieces.push(`주루에서는 ${records.도루}의 도루가 있었다`);
  }

  if (pieces.length === 0) {
    return "기록상 결정적인 장면은 한두 개로만 설명하기 어렵지만, 득점이 난 이닝마다 출루와 장타가 맞물리며 경기 흐름이 움직였다.";
  }

  return `결정적인 장면을 짚으면 ${pieces.join(". ")}. 이 기록들이 앞선 이닝 흐름과 맞물리면서 승부가 한쪽으로 기울었다.`;
}

function formatHitter(player) {
  const result = [
    `${player.team} ${player.name}`,
    `${player.atBats}타수 ${player.hits}안타`,
  ];

  if (player.rbi > 0) {
    result.push(`${player.rbi}타점`);
  }

  if (player.runs > 0) {
    result.push(`${player.runs}득점`);
  }

  return result.join(" ");
}

function buildHitterParagraph(game) {
  const hitters = game.details?.topHitters ?? [];

  if (hitters.length === 0) {
    return "타선에서는 특정 선수 한 명보다 출루와 진루를 이어간 과정이 중요했다. 득점권에서 한 번 더 연결한 팀이 경기 흐름을 잡았다.";
  }

  const hitterText = hitters.slice(0, 3).map(formatHitter).join(", ");

  return `타선에서는 ${hitterText} 등이 중심이었다. 단순히 안타 수가 많았다는 것보다, 득점권에서 타점으로 연결된 타석이 계속 나왔다는 점이 컸다.`;
}

function formatPitcher(player) {
  const parts = [`${player.team} ${player.name}`];

  if (player.innings) {
    parts.push(`${player.innings}이닝`);
  }

  if (player.hitsAllowed) {
    parts.push(`${player.hitsAllowed}피안타`);
  }

  if (player.runs) {
    parts.push(`${player.runs}실점`);
  }

  if (player.strikeouts) {
    parts.push(`${player.strikeouts}탈삼진`);
  }

  return parts.join(" ");
}

function buildPitcherParagraph(game) {
  const details = game.details;

  if (!details?.pitchers?.length) {
    return "마운드에서는 선발 이후 불펜 연결이 경기 흐름을 크게 좌우했다. 점수 차가 크든 작든, 추가 실점을 막는 이닝을 얼마나 만들었는지가 승부의 체감 온도를 바꿨다.";
  }

  const pieces = [];

  if (details.winningPitcher) {
    pieces.push(
      `${formatPitcher(details.winningPitcher)}으로 승리투수가 됐다`,
    );
  }

  if (details.savePitcher) {
    pieces.push(`${formatPitcher(details.savePitcher)}으로 세이브를 챙겼다`);
  }

  if (details.losingPitcher) {
    pieces.push(`${formatPitcher(details.losingPitcher)}으로 패전을 기록했다`);
  }

  if (pieces.length === 0) {
    const notablePitcher = details.pitchers
      .filter((pitcher) => pitcher.innings)
      .sort((a, b) => toNumber(b.strikeouts) - toNumber(a.strikeouts))[0];

    if (notablePitcher) {
      pieces.push(`${formatPitcher(notablePitcher)}이 기록상 눈에 들어왔다`);
    }
  }

  return `마운드에서는 ${pieces.join(". ")}. 점수 차가 벌어진 뒤에도 추가 실점을 막아낸 구간이 있었기 때문에, 타선이 만든 리드가 더 편하게 굳어졌다.`;
}

function buildRegretParagraph(game) {
  const details = game.details;
  const records = details?.etc ?? {};
  const pieces = [];

  if (records.실책) {
    pieces.push(`수비에서는 ${records.실책}의 실책 기록이 남았다`);
  }

  if (records.병살타) {
    pieces.push(`공격에서는 ${records.병살타}의 병살타가 흐름을 끊었다`);
  }

  if (records.도루자) {
    pieces.push(`주루에서는 ${records.도루자}의 도루자가 아쉬웠다`);
  }

  if (records.주루사) {
    pieces.push(`주루사 ${records.주루사}도 체크할 장면이었다`);
  }

  if (pieces.length === 0 && details?.losingPitcher) {
    pieces.push(
      `${formatPitcher(details.losingPitcher)}으로 기록된 마운드 부담이 컸다`,
    );
  }

  if (pieces.length === 0) {
    return "아쉬운 부분은 점수로 바로 드러나지 않는 세부 장면에 있다. 득점권에서 한 번 더 밀어붙일 수 있었는지, 수비 위치 선정과 주루 판단이 더 깔끔했는지는 다시 볼 만한 대목이다.";
  }

  return `아쉬웠던 장면도 있었다. ${pieces.join(". ")}. 점수 차가 벌어진 경기일수록 이런 수비와 주루, 병살 장면이 추격 분위기를 더 빨리 끊어버린다.`;
}

function buildNewsReferencesParagraph(game) {
  const articles = game.details?.newsArticles ?? [];

  if (articles.length === 0) {
    return "";
  }

  return [
    "참고한 네이버 기사",
    ...articles.slice(0, NEWS_ARTICLE_LIMIT).map((article, index) => {
      const source = article.source ? ` (${article.source})` : "";

      return `${index + 1}. ${article.title}${source}`;
    }),
  ].join("\n");
}

function buildContent(game) {
  const result = getGameResult(game);
  const sourceLine = `기록 기준: KBO 공식 경기 일정/결과 및 박스스코어, ${game.gameDate} ${game.time}, ${result.scoreLine}${
    game.stadium ? `, ${game.stadium}` : ""
  }.`;
  const linkLine = game.reviewUrl
    ? `KBO 게임센터 리뷰: ${game.reviewUrl}`
    : game.highlightUrl
      ? `KBO 하이라이트: ${game.highlightUrl}`
      : "KBO 공식 일정/결과 데이터를 기준으로 작성한 리뷰입니다.";

  return [
    buildNewsLeadParagraph(game),
    buildGameFlowParagraph(game),
    buildHitterParagraph(game),
    buildPitcherParagraph(game),
    buildRecordParagraph(game),
    buildRegretParagraph(game),
    linkLine,
    sourceLine,
    buildNewsReferencesParagraph(game),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildTags(game) {
  const result = getGameResult(game);
  const tags = ["KBO", "경기리뷰", game.awayTeam, game.homeTeam];

  if (result.type === "draw") {
    tags.push("무승부");
  } else if (result.margin <= 2) {
    tags.push("접전");
  } else if (result.margin >= 5) {
    tags.push("대승");
  } else {
    tags.push("승리");
  }

  return [...new Set(tags)];
}

async function findOrCreateAuthor() {
  return prisma.user.upsert({
    where: {
      email: DEMO_AUTHOR.email,
    },
    update: {
      nickname: DEMO_AUTHOR.nickname,
    },
    create: DEMO_AUTHOR,
  });
}

async function replaceDemoPosts(authorId, games) {
  await prisma.post.deleteMany({
    where: {
      authorId,
    },
  });

  const createdPosts = [];

  for (const [index, game] of games.entries()) {
    let details = null;

    try {
      details = await fetchKboGameDetails(game);
    } catch (error) {
      console.warn(
        `Skip box score detail for ${game.gameId ?? game.gameDate}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    let enrichedGame = {
      ...game,
      details,
    };

    try {
      const newsArticles = await fetchGameNewsArticles(enrichedGame);

      if (newsArticles.length < NEWS_ARTICLE_LIMIT) {
        console.warn(
          `Only found ${newsArticles.length} news articles for ${game.gameDate} ${game.awayTeam} VS ${game.homeTeam}.`,
        );
      }

      enrichedGame = {
        ...enrichedGame,
        details: {
          ...(enrichedGame.details ?? {}),
          newsArticles,
        },
      };
    } catch (error) {
      console.warn(
        `Skip news detail for ${game.gameDate} ${game.awayTeam} VS ${game.homeTeam}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const createdPost = await prisma.post.create({
      data: {
        title: buildTitle(enrichedGame),
        content: buildContent(enrichedGame),
        authorId,
        createdAt: new Date(Date.now() - index * 1000 * 60 * 45),
        tags: {
          create: buildTags(enrichedGame).map((tagName) => ({
            tag: {
              connectOrCreate: {
                where: {
                  name: tagName,
                },
                create: {
                  name: tagName,
                },
              },
            },
          })),
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    createdPosts.push(createdPost);
  }

  return createdPosts;
}

async function main() {
  await loadEnvFile();

  const author = await findOrCreateAuthor();
  const games = await fetchRecentCompletedGames();

  if (games.length === 0) {
    throw new Error("KBO 공식 일정/결과에서 완료된 경기를 찾지 못했습니다.");
  }

  const createdPosts = await replaceDemoPosts(author.id, games);

  console.log(
    `Seed complete. Replaced demo author posts with ${createdPosts.length} detailed KBO game review posts.`,
  );
  console.log(`Source: ${KBO_SCHEDULE_URL}`);

  for (const post of createdPosts) {
    console.log(`CREATED: ${post.title}`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed demo posts.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

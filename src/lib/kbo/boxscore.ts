export type KboLineScoreTeam = {
  team: string;
  runsByInning: string[];
  runs: string;
  hits: string;
  errors: string;
  balls: string;
};

export type KboLineScore = {
  innings: string[];
  away: KboLineScoreTeam;
  home: KboLineScoreTeam;
};

export type KboHitterRecord = {
  order: string;
  position: string;
  name: string;
  atBats: string;
  hits: string;
  rbi: string;
  runs: string;
  average: string;
  isTotal: boolean;
};

export type KboPitcherRecord = {
  name: string;
  appearance: string;
  result: string;
  innings: string;
  pitches: string;
  hits: string;
  homeRuns: string;
  walks: string;
  strikeouts: string;
  runs: string;
  earnedRuns: string;
  era: string;
};

export type KboTeamHitterRecords = {
  team: string;
  rows: KboHitterRecord[];
};

export type KboTeamPitcherRecords = {
  team: string;
  rows: KboPitcherRecord[];
};

export type KboEtcRecord = {
  label: string;
  value: string;
};

export type KboBoxscoreResult = {
  source: string;
  gameId: string;
  gameDate: string;
  awayTeam: string;
  homeTeam: string;
  lineScore: KboLineScore | null;
  hitters: KboTeamHitterRecords[];
  pitchers: KboTeamPitcherRecords[];
  etcRecords: KboEtcRecord[];
};

type FetchKboBoxscoreInput = {
  gameId: string;
  gameDate: string;
  awayTeam: string;
  homeTeam: string;
};

type KboGridCell = {
  Text?: unknown;
  text?: unknown;
  Value?: unknown;
};

type KboGridRow = {
  row?: KboGridCell[];
};

type KboGridTable = {
  headers?: KboGridRow[];
  rows?: KboGridRow[];
  tfoot?: KboGridRow[];
};

type KboScoreBoardResponse = {
  code?: string;
  msg?: string;
  S_NM?: string;
  table2?: unknown;
  table3?: unknown;
  T_SCORE_CN?: number | string | null;
  B_SCORE_CN?: number | string | null;
  maxInning?: number | string | null;
  realMaxInning?: number | string | null;
};

type KboBoxScoreResponse = {
  code?: string;
  msg?: string;
  tableEtc?: unknown;
  arrHitter?: {
    table1?: unknown;
    table3?: unknown;
  }[];
  arrPitcher?: {
    table?: unknown;
  }[];
};

type KboRawHitterData = NonNullable<KboBoxScoreResponse["arrHitter"]>[number];
type KboRawPitcherData = NonNullable<KboBoxScoreResponse["arrPitcher"]>[number];

const KBO_BASE_URL = "https://www.koreabaseball.com";
const KBO_SCOREBOARD_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetScoreBoardScroll`;
const KBO_BOXSCORE_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetBoxScoreScroll`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getCompactDate(value: string): string {
  return value.replace(/\D/g, "");
}

function getSeriesIdFromGameId(gameId: string): string {
  return gameId.match(/\d$/)?.[0] ?? "0";
}

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&nbsp;/gi, " ")
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
    );
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return decodeHtml(String(value))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGridTable(value: unknown): KboGridTable | null {
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      return isRecord(parsed) ? (parsed as KboGridTable) : null;
    } catch {
      return null;
    }
  }

  return isRecord(value) ? (value as KboGridTable) : null;
}

function getCellText(cell: KboGridCell | undefined): string {
  return cleanText(cell?.Text ?? cell?.text ?? cell?.Value);
}

function getGridRows(value: unknown): string[][] {
  const table = parseGridTable(value);

  return (table?.rows ?? [])
    .map((row) => (row.row ?? []).map(getCellText))
    .filter((row) => row.some(Boolean));
}

function getGridFooterRows(value: unknown): string[][] {
  const table = parseGridTable(value);

  return (table?.tfoot ?? [])
    .map((row) => (row.row ?? []).map(getCellText))
    .filter((row) => row.some(Boolean));
}

function getGridHeader(value: unknown): string[] {
  const table = parseGridTable(value);

  return (table?.headers?.[0]?.row ?? []).map(getCellText);
}

function getInteger(value: unknown): number | null {
  const number = Number(value);

  return Number.isInteger(number) ? number : null;
}

function getLineScoreTotal(
  row: string[] | undefined,
  fallbackRuns: unknown,
): Pick<KboLineScoreTeam, "runs" | "hits" | "errors" | "balls"> {
  return {
    runs: row?.[0] ?? cleanText(fallbackRuns),
    hits: row?.[1] ?? "",
    errors: row?.[2] ?? "",
    balls: row?.[3] ?? "",
  };
}

function buildLineScore(
  scoreBoard: KboScoreBoardResponse | null,
  awayTeam: string,
  homeTeam: string,
): KboLineScore | null {
  const inningHeader = getGridHeader(scoreBoard?.table2);
  const scoreRows = getGridRows(scoreBoard?.table2);
  const totalRows = getGridRows(scoreBoard?.table3);

  if (inningHeader.length === 0 || scoreRows.length < 2) {
    return null;
  }

  const inningCount =
    getInteger(scoreBoard?.realMaxInning) ??
    Math.max(
      scoreRows[0]?.filter((score) => score && score !== "-").length ?? 0,
      scoreRows[1]?.filter((score) => score && score !== "-").length ?? 0,
    ) ??
    inningHeader.length;
  const innings = inningHeader.slice(0, inningCount);
  const awayTotal = getLineScoreTotal(totalRows[0], scoreBoard?.T_SCORE_CN);
  const homeTotal = getLineScoreTotal(totalRows[1], scoreBoard?.B_SCORE_CN);

  return {
    innings,
    away: {
      team: awayTeam,
      runsByInning: (scoreRows[0] ?? []).slice(0, innings.length),
      ...awayTotal,
    },
    home: {
      team: homeTeam,
      runsByInning: (scoreRows[1] ?? []).slice(0, innings.length),
      ...homeTotal,
    },
  };
}

function buildHitterRecords(
  team: string,
  hitterData: KboRawHitterData | undefined,
): KboTeamHitterRecords {
  const lineupRows = getGridRows(hitterData?.table1);
  const statRows = getGridRows(hitterData?.table3);
  const totalRows = getGridFooterRows(hitterData?.table3);
  const rows = lineupRows
    .map((lineupRow, index) => {
      const statRow = statRows[index] ?? [];
      const name = lineupRow[2] ?? "";

      if (!name) {
        return null;
      }

      return {
        order: lineupRow[0] ?? "",
        position: lineupRow[1] ?? "",
        name,
        atBats: statRow[0] ?? "",
        hits: statRow[1] ?? "",
        rbi: statRow[2] ?? "",
        runs: statRow[3] ?? "",
        average: statRow[4] ?? "",
        isTotal: false,
      };
    })
    .filter((row): row is KboHitterRecord => Boolean(row));
  const totalRow = totalRows[0];

  if (totalRow) {
    rows.push({
      order: "",
      position: "",
      name: "TOTAL",
      atBats: totalRow[0] ?? "",
      hits: totalRow[1] ?? "",
      rbi: totalRow[2] ?? "",
      runs: totalRow[3] ?? "",
      average: totalRow[4] ?? "",
      isTotal: true,
    });
  }

  return {
    team,
    rows,
  };
}

function getColumn(
  row: string[],
  header: string[],
  columnName: string,
  fallbackIndex: number,
): string {
  const columnIndex = header.indexOf(columnName);
  const index = columnIndex >= 0 ? columnIndex : fallbackIndex;

  return row[index] ?? "";
}

function buildPitcherRecords(
  team: string,
  pitcherData: KboRawPitcherData | undefined,
): KboTeamPitcherRecords {
  const header = getGridHeader(pitcherData?.table);
  const rows = getGridRows(pitcherData?.table)
    .map((row) => {
      const name = getColumn(row, header, "선수명", 0);

      if (!name || name === "TOTAL") {
        return null;
      }

      return {
        name,
        appearance: getColumn(row, header, "등판", 1),
        result: getColumn(row, header, "결과", 2),
        innings: getColumn(row, header, "이닝", 6),
        pitches: getColumn(row, header, "투구수", 8),
        hits: getColumn(row, header, "피안타", 10),
        homeRuns: getColumn(row, header, "홈런", 11),
        walks: getColumn(row, header, "4사구", 12),
        strikeouts: getColumn(row, header, "삼진", 13),
        runs: getColumn(row, header, "실점", 14),
        earnedRuns: getColumn(row, header, "자책", 15),
        era: getColumn(row, header, "평균자책점", 16),
      };
    })
    .filter((row): row is KboPitcherRecord => Boolean(row));

  return {
    team,
    rows,
  };
}

function buildEtcRecords(boxScore: KboBoxScoreResponse | null): KboEtcRecord[] {
  return getGridRows(boxScore?.tableEtc)
    .map(([label, value]) => {
      if (!label || !value) {
        return null;
      }

      return {
        label,
        value,
      };
    })
    .filter((record): record is KboEtcRecord => Boolean(record));
}

async function fetchKboJson<T>(
  url: string,
  params: Record<string, string>,
  referer: string,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: referer,
      "User-Agent": "KboTalk/0.1 KBO official boxscore reader",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams(params),
    next: {
      revalidate: 30,
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`KBO record request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function fetchKboBoxscore({
  gameId,
  gameDate,
  awayTeam,
  homeTeam,
}: FetchKboBoxscoreInput): Promise<KboBoxscoreResult> {
  const compactDate = getCompactDate(gameDate);

  if (!gameId || !compactDate) {
    throw new Error("gameId and gameDate are required.");
  }

  const source = `${KBO_BASE_URL}/Schedule/GameCenter/Main.aspx?gameDate=${compactDate}&gameId=${encodeURIComponent(gameId)}&section=REVIEW`;
  const params = {
    leId: "1",
    srId: getSeriesIdFromGameId(gameId),
    seasonId: compactDate.slice(0, 4),
    gameId,
  };
  const [scoreBoard, boxScore] = await Promise.all([
    fetchKboJson<KboScoreBoardResponse>(KBO_SCOREBOARD_URL, params, source),
    fetchKboJson<KboBoxScoreResponse>(KBO_BOXSCORE_URL, params, source),
  ]);

  return {
    source,
    gameId,
    gameDate,
    awayTeam,
    homeTeam,
    lineScore: buildLineScore(scoreBoard, awayTeam, homeTeam),
    hitters: [
      buildHitterRecords(awayTeam, boxScore.arrHitter?.[0]),
      buildHitterRecords(homeTeam, boxScore.arrHitter?.[1]),
    ],
    pitchers: [
      buildPitcherRecords(awayTeam, boxScore.arrPitcher?.[0]),
      buildPitcherRecords(homeTeam, boxScore.arrPitcher?.[1]),
    ],
    etcRecords: buildEtcRecords(boxScore),
  };
}

export type KboLineupBatter = {
  batOrder: number;
  position: string;
  name: string;
  war: number | null;
};

export type KboTeamLineup = {
  team: string;
  batters: KboLineupBatter[];
  totalWar: number | null;
  coreWar: number | null;
};

export type KboLineupResult = {
  source: string;
  lineupReady: boolean;
  away: KboTeamLineup | null;
  home: KboTeamLineup | null;
};

type FetchKboLineupInput = {
  gameId: string;
  gameDate: string;
  awayTeam: string;
  homeTeam: string;
};

const KBO_BASE_URL = "https://www.koreabaseball.com";
const KBO_LINEUP_ANALYSIS_URL = `${KBO_BASE_URL}/ws/Schedule.asmx/GetLineUpAnalysis`;

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

function getCompactDate(value: string): string {
  return value.replace(/\D/g, "");
}

function getSeriesIdFromGameId(gameId: string): string {
  return gameId.match(/\d$/)?.[0] ?? "0";
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

function getLineupReady(value: unknown): boolean {
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

function cleanCellText(value: unknown): string {
  const text =
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : getString(value);

  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseGridTable(value: unknown): Record<string, unknown> | null {
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

function sum(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0);
}

function buildTeamLineup(
  team: string,
  batters: KboLineupBatter[],
): KboTeamLineup | null {
  const sortedBatters = [...batters]
    .filter((batter) => batter.name && batter.batOrder > 0)
    .sort((left, right) => left.batOrder - right.batOrder)
    .slice(0, 9);

  if (sortedBatters.length === 0) {
    return null;
  }

  const warValues = sortedBatters
    .map((batter) => batter.war)
    .filter((value): value is number => value !== null);
  const coreWarValues = sortedBatters
    .filter((batter) => batter.batOrder >= 3 && batter.batOrder <= 5)
    .map((batter) => batter.war)
    .filter((value): value is number => value !== null);

  return {
    team,
    batters: sortedBatters,
    totalWar: sum(warValues),
    coreWar: sum(coreWarValues),
  };
}

function parseLineupTable(team: string, value: unknown): KboTeamLineup | null {
  const table = parseGridTable(value);
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const batters = rows.flatMap((rowValue) => {
    if (!isRecord(rowValue) || !Array.isArray(rowValue.row)) {
      return [];
    }

    const cells = rowValue.row;
    const getCellText = (index: number) => {
      const cell = cells[index];

      if (!isRecord(cell)) {
        return "";
      }

      return cleanCellText(cell.Text ?? cell.text ?? cell.Value);
    };
    const batOrder = getNumber(getCellText(0));

    if (batOrder === null) {
      return [];
    }

    return {
      batOrder,
      position: getCellText(1),
      name: getCellText(2),
      war: getNumber(getCellText(3)),
    };
  });

  return buildTeamLineup(team, batters);
}

export async function fetchKboLineup({
  gameId,
  gameDate,
  awayTeam,
  homeTeam,
}: FetchKboLineupInput): Promise<KboLineupResult> {
  const compactDate = getCompactDate(gameDate);

  if (!gameId || !compactDate) {
    throw new Error("gameId and gameDate are required.");
  }

  const source = `${KBO_BASE_URL}/Schedule/GameCenter/Main.aspx?gameDate=${compactDate}&gameId=${encodeURIComponent(gameId)}&section=LINEUP`;
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
      srId: getSeriesIdFromGameId(gameId),
      seasonId: compactDate.slice(0, 4),
      gameId,
    }),
    next: {
      revalidate: 60,
    },
  });

  if (!response.ok) {
    throw new Error("KBO lineup lookup failed.");
  }

  const data = (await response.json()) as unknown;

  if (!Array.isArray(data)) {
    throw new Error("KBO lineup response is invalid.");
  }

  const lineupReady = getLineupReady(getFirstKboValue(data[0]));
  const homeAggregate = getFirstKboValue(data[1]);
  const awayAggregate = getFirstKboValue(data[2]);
  const officialHomeTeam = isRecord(homeAggregate)
    ? getString(homeAggregate.T_NM) || homeTeam
    : homeTeam;
  const officialAwayTeam = isRecord(awayAggregate)
    ? getString(awayAggregate.T_NM) || awayTeam
    : awayTeam;
  const home = parseLineupTable(officialHomeTeam, getFirstKboValue(data[3]));
  const away = parseLineupTable(officialAwayTeam, getFirstKboValue(data[4]));

  return {
    source,
    lineupReady,
    away,
    home,
  };
}

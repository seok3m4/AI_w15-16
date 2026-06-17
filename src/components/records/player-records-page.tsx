"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { KboStandingsPanel } from "@/components/ai/kbo-standings-panel";

type RecordType = "hitter" | "pitcher";

type PlayerRecord = {
  ranking: number;
  playerId: string;
  playerName: string;
  playerImageUrl: string | null;
  teamName: string;
  teamId: string;
  teamImageUrl: string | null;
  position: string;
  backNumber: number | null;
  isQualified: boolean;
  hitter?: {
    battingAverage: number | null;
    games: number | null;
    atBats: number | null;
    hits: number | null;
    homeRuns: number | null;
    rbi: number | null;
    runs: number | null;
    steals: number | null;
    obp: number | null;
    slg: number | null;
    ops: number | null;
    war: number | null;
  };
  pitcher?: {
    era: number | null;
    games: number | null;
    wins: number | null;
    losses: number | null;
    saves: number | null;
    holds: number | null;
    innings: string;
    strikeouts: number | null;
    whip: number | null;
    qs: number | null;
    war: number | null;
  };
};

type PlayerRecordsResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: {
    source: string;
    fetchedAt: string;
    season: string;
    type: RecordType;
    sortField: string;
    sortDirection: "asc" | "desc";
    records: PlayerRecord[];
  };
};

type SortOption = {
  value: string;
  label: string;
  direction: "asc" | "desc";
};

const seasons = ["2026", "2025", "2024"];
const sortOptions: Record<RecordType, SortOption[]> = {
  hitter: [
    { value: "hitterHra", label: "타율", direction: "desc" },
    { value: "hitterHr", label: "홈런", direction: "desc" },
    { value: "hitterRbi", label: "타점", direction: "desc" },
    { value: "hitterOps", label: "OPS", direction: "desc" },
    { value: "hitterWar", label: "WAR", direction: "desc" },
    { value: "hitterSb", label: "도루", direction: "desc" },
  ],
  pitcher: [
    { value: "pitcherEra", label: "평균자책", direction: "asc" },
    { value: "pitcherWin", label: "승", direction: "desc" },
    { value: "pitcherSave", label: "세이브", direction: "desc" },
    { value: "pitcherHold", label: "홀드", direction: "desc" },
    { value: "pitcherKk", label: "탈삼진", direction: "desc" },
    { value: "pitcherWhip", label: "WHIP", direction: "asc" },
    { value: "pitcherWar", label: "WAR", direction: "desc" },
  ],
};

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "-" : String(value);
}

function formatDecimal(
  value: number | null | undefined,
  digits: number,
): string {
  return value === null || value === undefined ? "-" : value.toFixed(digits);
}

function formatRate(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return value.toFixed(3).replace(/^0/, "");
}

function getSortDirection(type: RecordType, sortField: string): "asc" | "desc" {
  return (
    sortOptions[type].find((option) => option.value === sortField)?.direction ??
    "desc"
  );
}

function getPlayerSubText(record: PlayerRecord): string {
  const parts = [
    record.teamName,
    record.position,
    record.backNumber ? `#${record.backNumber}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function getPlayerImageSource(imageUrl: string | null): string | null {
  if (!imageUrl) {
    return null;
  }

  const params = new URLSearchParams({ url: imageUrl });

  return `/api/kbo/player-image?${params.toString()}`;
}

function getImageStyle(imageUrl: string | null): CSSProperties | undefined {
  const playerImageSource = getPlayerImageSource(imageUrl);

  if (!playerImageSource) {
    return undefined;
  }

  return {
    backgroundImage: `url("${playerImageSource.replaceAll('"', "%22")}")`,
  };
}

function getRecordCellClass(isActive: boolean): string {
  return [
    "px-3 py-2 text-right",
    isActive ? "font-black text-[#111827]" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getHeaderCellClass(isActive: boolean): string {
  return [
    "px-3 py-2 text-right",
    isActive ? "text-[#111827]" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getSortLabel(type: RecordType, sortField: string): string {
  return (
    sortOptions[type].find((option) => option.value === sortField)?.label ??
    "기록"
  );
}

function getLeaderStatValue(
  record: PlayerRecord,
  type: RecordType,
  sortField: string,
): string {
  if (type === "hitter") {
    switch (sortField) {
      case "hitterHra":
        return formatRate(record.hitter?.battingAverage);
      case "hitterHr":
        return formatNumber(record.hitter?.homeRuns);
      case "hitterRbi":
        return formatNumber(record.hitter?.rbi);
      case "hitterOps":
        return formatRate(record.hitter?.ops);
      case "hitterWar":
        return formatDecimal(record.hitter?.war, 2);
      case "hitterSb":
        return formatNumber(record.hitter?.steals);
      default:
        return "-";
    }
  }

  switch (sortField) {
    case "pitcherEra":
      return formatDecimal(record.pitcher?.era, 2);
    case "pitcherWin":
      return formatNumber(record.pitcher?.wins);
    case "pitcherSave":
      return formatNumber(record.pitcher?.saves);
    case "pitcherHold":
      return formatNumber(record.pitcher?.holds);
    case "pitcherKk":
      return formatNumber(record.pitcher?.strikeouts);
    case "pitcherWhip":
      return formatDecimal(record.pitcher?.whip, 2);
    case "pitcherWar":
      return formatDecimal(record.pitcher?.war, 2);
    default:
      return "-";
  }
}

function getLeaderSubSummary(record: PlayerRecord, type: RecordType): string {
  if (type === "hitter") {
    return `홈런 ${formatNumber(record.hitter?.homeRuns)} · 타점 ${formatNumber(
      record.hitter?.rbi,
    )} · OPS ${formatRate(record.hitter?.ops)}`;
  }

  return `승 ${formatNumber(record.pitcher?.wins)} · 탈삼진 ${formatNumber(
    record.pitcher?.strikeouts,
  )} · 이닝 ${record.pitcher?.innings || "-"}`;
}

async function requestPlayerRecords(input: {
  season: string;
  type: RecordType;
  sortField: string;
  refresh?: boolean;
}): Promise<PlayerRecordsResponse> {
  const params = new URLSearchParams({
    season: input.season,
    type: input.type,
    sortField: input.sortField,
    sortDirection: getSortDirection(input.type, input.sortField),
    page: "1",
    pageSize: "100",
  });

  if (input.refresh) {
    params.set("refresh", "true");
  }

  const response = await fetch(`/api/kbo/player-records?${params.toString()}`, {
    credentials: "include",
  });
  const responseData = (await response.json()) as PlayerRecordsResponse;

  if (!response.ok) {
    return {
      status: "unavailable",
      message: responseData.message ?? "선수 기록을 불러오지 못했습니다.",
    };
  }

  return responseData;
}

function PlayerIdentity({ record }: { record: PlayerRecord }) {
  return (
    <div className="flex min-w-[180px] items-center gap-2">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[#eef3ff] bg-cover bg-center bg-no-repeat text-xs font-black text-[#2f4f9f]"
        style={getImageStyle(record.playerImageUrl)}
      >
        {record.playerImageUrl ? null : record.playerName.slice(0, 1)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#202632]">
          {record.playerName}
        </p>
        <p className="mt-0.5 truncate text-xs text-[#667085]">
          {getPlayerSubText(record)}
        </p>
      </div>
    </div>
  );
}

function HitterRow({
  record,
  sortField,
}: {
  record: PlayerRecord;
  sortField: string;
}) {
  const hitter = record.hitter;

  return (
    <tr className="border-b border-[#edf1f7] hover:bg-[#fbfcff]">
      <td className="px-3 py-2 text-center text-sm font-black text-[#2f4f9f]">
        {record.ranking}
      </td>
      <td className="px-3 py-2">
        <PlayerIdentity record={record} />
      </td>
      <td className={getRecordCellClass(sortField === "hitterHra")}>
        {formatRate(hitter?.battingAverage)}
      </td>
      <td className="px-3 py-2 text-right">{formatNumber(hitter?.games)}</td>
      <td className="px-3 py-2 text-right">{formatNumber(hitter?.hits)}</td>
      <td className={getRecordCellClass(sortField === "hitterHr")}>
        {formatNumber(hitter?.homeRuns)}
      </td>
      <td className={getRecordCellClass(sortField === "hitterRbi")}>
        {formatNumber(hitter?.rbi)}
      </td>
      <td className="px-3 py-2 text-right">{formatNumber(hitter?.runs)}</td>
      <td className={getRecordCellClass(sortField === "hitterSb")}>
        {formatNumber(hitter?.steals)}
      </td>
      <td className={getRecordCellClass(sortField === "hitterOps")}>
        {formatRate(hitter?.ops)}
      </td>
      <td className={getRecordCellClass(sortField === "hitterWar")}>
        {formatDecimal(hitter?.war, 2)}
      </td>
    </tr>
  );
}

function PitcherRow({
  record,
  sortField,
}: {
  record: PlayerRecord;
  sortField: string;
}) {
  const pitcher = record.pitcher;

  return (
    <tr className="border-b border-[#edf1f7] hover:bg-[#fbfcff]">
      <td className="px-3 py-2 text-center text-sm font-black text-[#2f4f9f]">
        {record.ranking}
      </td>
      <td className="px-3 py-2">
        <PlayerIdentity record={record} />
      </td>
      <td className={getRecordCellClass(sortField === "pitcherEra")}>
        {formatDecimal(pitcher?.era, 2)}
      </td>
      <td className="px-3 py-2 text-right">{formatNumber(pitcher?.games)}</td>
      <td className={getRecordCellClass(sortField === "pitcherWin")}>
        {formatNumber(pitcher?.wins)}
      </td>
      <td className="px-3 py-2 text-right">{formatNumber(pitcher?.losses)}</td>
      <td className={getRecordCellClass(sortField === "pitcherSave")}>
        {formatNumber(pitcher?.saves)}
      </td>
      <td className={getRecordCellClass(sortField === "pitcherHold")}>
        {formatNumber(pitcher?.holds)}
      </td>
      <td className="px-3 py-2 text-right">{pitcher?.innings || "-"}</td>
      <td className={getRecordCellClass(sortField === "pitcherKk")}>
        {formatNumber(pitcher?.strikeouts)}
      </td>
      <td className={getRecordCellClass(sortField === "pitcherWhip")}>
        {formatDecimal(pitcher?.whip, 2)}
      </td>
      <td className={getRecordCellClass(sortField === "pitcherWar")}>
        {formatDecimal(pitcher?.war, 2)}
      </td>
    </tr>
  );
}

function LeaderCard({
  rank,
  record,
  recordType,
  sortField,
}: {
  rank: number;
  record: PlayerRecord;
  recordType: RecordType;
  sortField: string;
}) {
  const sortLabel = getSortLabel(recordType, sortField);

  return (
    <article className="community-subpanel bg-[#fbfcff] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-sm bg-[#071a3d] px-2 text-sm font-black text-white">
            {rank}
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
              현재 리더
            </p>
            <p className="mt-1 text-lg font-black text-[#071a3d]">
              {record.playerName}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-[#667085]">{sortLabel}</p>
          <p className="mt-1 text-2xl font-black text-[#d71920]">
            {getLeaderStatValue(record, recordType, sortField)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm font-bold text-[#344054]">
        {getPlayerSubText(record)}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#667085]">
        {getLeaderSubSummary(record, recordType)}
      </p>
    </article>
  );
}

function getRecordSummaryItems(
  record: PlayerRecord,
  type: RecordType,
): Array<{ label: string; value: string }> {
  if (type === "hitter") {
    return [
      { label: "타율", value: formatRate(record.hitter?.battingAverage) },
      { label: "홈런", value: formatNumber(record.hitter?.homeRuns) },
      { label: "타점", value: formatNumber(record.hitter?.rbi) },
      { label: "OPS", value: formatRate(record.hitter?.ops) },
    ];
  }

  return [
    { label: "ERA", value: formatDecimal(record.pitcher?.era, 2) },
    { label: "승", value: formatNumber(record.pitcher?.wins) },
    { label: "세이브", value: formatNumber(record.pitcher?.saves) },
    { label: "WHIP", value: formatDecimal(record.pitcher?.whip, 2) },
  ];
}

function MobileRecordCard({
  record,
  recordType,
  sortField,
}: {
  record: PlayerRecord;
  recordType: RecordType;
  sortField: string;
}) {
  const summaryItems = getRecordSummaryItems(record, recordType);

  return (
    <article className="community-subpanel bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-sm bg-[#071a3d] px-2 text-sm font-black text-white">
            {record.ranking}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-[#071a3d]">
              {record.playerName}
            </p>
            <p className="mt-1 truncate text-xs text-[#667085]">
              {getPlayerSubText(record)}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-black text-[#667085]">
            {getSortLabel(recordType, sortField)}
          </p>
          <p className="mt-1 text-xl font-black text-[#d71920]">
            {getLeaderStatValue(record, recordType, sortField)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {summaryItems.map((item) => (
          <div className="rounded-sm bg-[#f6f8fc] px-3 py-2" key={item.label}>
            <p className="text-[11px] font-bold text-[#667085]">{item.label}</p>
            <p className="mt-1 text-sm font-black text-[#202632]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function PlayerRecordsPage() {
  const [recordType, setRecordType] = useState<RecordType>("hitter");
  const [season, setSeason] = useState("2026");
  const [sortField, setSortField] = useState("hitterHra");
  const [teamFilter, setTeamFilter] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [data, setData] = useState<PlayerRecordsResponse["result"] | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadRecords(refresh = false) {
    setIsLoading(true);
    setMessage("");

    try {
      const responseData = await requestPlayerRecords({
        season,
        type: recordType,
        sortField,
        refresh,
      });

      if (!responseData.result) {
        setData(null);
        setMessage(responseData.message ?? "선수 기록을 불러오지 못했습니다.");
        return;
      }

      setData(responseData.result);
    } catch {
      setData(null);
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialRecords() {
      try {
        const responseData = await requestPlayerRecords({
          season,
          type: recordType,
          sortField,
        });

        if (!isMounted) {
          return;
        }

        if (!responseData.result) {
          setData(null);
          setMessage(
            responseData.message ?? "선수 기록을 불러오지 못했습니다.",
          );
          return;
        }

        setData(responseData.result);
        setMessage("");
      } catch {
        if (isMounted) {
          setData(null);
          setMessage("네트워크 연결을 확인해주세요.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialRecords();

    return () => {
      isMounted = false;
    };
  }, [recordType, season, sortField]);

  const teamOptions = useMemo(() => {
    const teams = new Set(data?.records.map((record) => record.teamName) ?? []);

    return [...teams].filter(Boolean).sort();
  }, [data]);

  const filteredRecords = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return (data?.records ?? []).filter((record) => {
      const matchesTeam = !teamFilter || record.teamName === teamFilter;
      const matchesKeyword =
        !keyword ||
        record.playerName.toLowerCase().includes(keyword) ||
        record.teamName.toLowerCase().includes(keyword) ||
        record.position.toLowerCase().includes(keyword);

      return matchesTeam && matchesKeyword;
    });
  }, [data, searchKeyword, teamFilter]);
  const topLeaders = filteredRecords.slice(0, 3);

  function handleChangeRecordType(nextType: RecordType) {
    if (recordType === nextType) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setData(null);
    setRecordType(nextType);
    setSortField(sortOptions[nextType][0].value);
    setTeamFilter("");
    setSearchKeyword("");
  }

  function handleChangeSeason(nextSeason: string) {
    if (season === nextSeason) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setData(null);
    setSeason(nextSeason);
    setTeamFilter("");
  }

  function handleChangeSortField(nextSortField: string) {
    if (sortField === nextSortField) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setData(null);
    setSortField(nextSortField);
  }

  return (
    <section className="page-shell space-y-4">
      <div className="community-panel">
        <div className="community-page-header">
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#071a3d]">
              순위/기록실
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#667085]">
              KBO 팀 순위와 선수 주요 기록을 한 페이지에서 확인합니다.
            </p>
          </div>
        </div>
      </div>

      <KboStandingsPanel />

      <div className="community-panel">
        <div className="community-page-header">
          <div>
            <h2 className="text-xl font-black tracking-tight text-[#071a3d]">
              선수 기록실
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#667085]">
              타자와 투수 주요 기록을 한 화면에서 비교하고, 선수명이나 팀으로 빠르게 찾아봅니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              className="community-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => void loadRecords(true)}
              type="button"
            >
              {isLoading ? "불러오는 중" : "새로고침"}
            </button>
            <a
              className="community-button-danger"
              href={
                data?.source ??
                "https://m.sports.naver.com/kbaseball/record/kbo?seasonCode=2026&tab=hitter"
              }
              rel="noreferrer"
              target="_blank"
            >
              원문 보기
            </a>
          </div>
        </div>

        <div className="community-toolbar">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="community-segmented min-w-[220px]">
              <button
                className="community-segment-button"
                data-active={recordType === "hitter"}
                onClick={() => handleChangeRecordType("hitter")}
                type="button"
              >
                타자 기록
              </button>
              <button
                className="community-segment-button"
                data-active={recordType === "pitcher"}
                onClick={() => handleChangeRecordType("pitcher")}
                type="button"
              >
                투수 기록
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
              <select
                className="community-input text-sm font-bold"
                disabled={isLoading}
                onChange={(event) => handleChangeSeason(event.target.value)}
                value={season}
              >
                {seasons.map((seasonOption) => (
                  <option key={seasonOption} value={seasonOption}>
                    {seasonOption} 시즌
                  </option>
                ))}
              </select>
              <select
                className="community-input text-sm font-bold"
                disabled={isLoading}
                onChange={(event) => handleChangeSortField(event.target.value)}
                value={sortField}
              >
                {sortOptions[recordType].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} 순
                  </option>
                ))}
              </select>
              <select
                className="community-input text-sm font-bold"
                onChange={(event) => setTeamFilter(event.target.value)}
                value={teamFilter}
              >
                <option value="">전체 팀</option>
                {teamOptions.map((teamName) => (
                  <option key={teamName} value={teamName}>
                    {teamName}
                  </option>
                ))}
              </select>
              <input
                className="community-input text-sm"
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="선수명, 팀, 포지션 검색"
                value={searchKeyword}
              />
            </div>
          </div>
        </div>

        {data ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#d8deea] bg-white px-5 py-3 text-sm font-bold text-[#667085]">
            <span>{data.season} 시즌</span>
            <span>|</span>
            <span>{filteredRecords.length}명 표시</span>
            <span>|</span>
            <span>{formatFetchedAt(data.fetchedAt)} 조회</span>
            <span>|</span>
            <span>{data.sortDirection === "asc" ? "낮은 순" : "높은 순"}</span>
          </div>
        ) : null}

        {data && topLeaders.length > 0 ? (
          <div className="border-b border-[#d8deea] bg-white px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-[#071a3d]">
                  현재 {getSortLabel(recordType, sortField)} 상위권
                </h2>
                <p className="mt-1 text-xs text-[#667085]">
                  현재 필터 조건 기준으로 상위 선수만 먼저 빠르게 확인합니다.
                </p>
              </div>
              <span className="community-chip">
                TOP {topLeaders.length}
              </span>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {topLeaders.map((record, index) => (
                <LeaderCard
                  key={`${record.playerId}-${index}`}
                  rank={index + 1}
                  record={record}
                  recordType={recordType}
                  sortField={sortField}
                />
              ))}
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="border-b border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#b91c1c]">
            {message}
          </p>
        ) : null}

        {isLoading && !data ? (
          <div className="overflow-x-auto px-4 py-4">
            <div className="community-subpanel w-full min-w-[960px] overflow-hidden bg-white">
              <div className="grid grid-cols-[60px_220px_repeat(9,1fr)] gap-0 border-b border-[#edf1f7] bg-[#f8fafc] px-3 py-3">
                {Array.from({ length: 11 }).map((_, index) => (
                  <div
                    className="h-4 animate-pulse rounded bg-[#e5ebf6]"
                    key={`records-header-${index}`}
                  />
                ))}
              </div>
              <div className="divide-y divide-[#edf1f7]">
                {Array.from({ length: 8 }).map((_, rowIndex) => (
                  <div
                    className="grid grid-cols-[60px_220px_repeat(9,1fr)] items-center gap-3 px-3 py-3"
                    key={`records-row-${rowIndex}`}
                  >
                    {Array.from({ length: 11 }).map((__, cellIndex) => (
                      <div
                        className="h-4 animate-pulse rounded bg-[#eef3fb]"
                        key={`records-cell-${rowIndex}-${cellIndex}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && data && filteredRecords.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-base font-black text-[#1f3470]">
              표시할 선수가 없습니다.
            </h3>
            <p className="mt-2 text-sm text-[#667085]">
              팀 필터나 검색어를 바꿔보세요.
            </p>
          </div>
        ) : null}

        {data && filteredRecords.length > 0 ? (
          <div className="px-4 py-4 md:hidden">
            <div className="grid gap-3">
              {filteredRecords.map((record) => (
                <MobileRecordCard
                  key={record.playerId}
                  record={record}
                  recordType={recordType}
                  sortField={sortField}
                />
              ))}
            </div>
          </div>
        ) : null}

        {data && filteredRecords.length > 0 ? (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[960px] border-collapse text-sm text-[#344054]">
              <thead className="bg-[#f6f8fc] text-xs font-black text-[#667085]">
                {recordType === "hitter" ? (
                  <tr>
                    <th className="w-14 px-3 py-2 text-center">순위</th>
                    <th className="px-3 py-2 text-left">선수</th>
                    <th className={getHeaderCellClass(sortField === "hitterHra")}>
                      타율
                    </th>
                    <th className="px-3 py-2 text-right">경기</th>
                    <th className="px-3 py-2 text-right">안타</th>
                    <th className={getHeaderCellClass(sortField === "hitterHr")}>
                      홈런
                    </th>
                    <th className={getHeaderCellClass(sortField === "hitterRbi")}>
                      타점
                    </th>
                    <th className="px-3 py-2 text-right">득점</th>
                    <th className={getHeaderCellClass(sortField === "hitterSb")}>
                      도루
                    </th>
                    <th className={getHeaderCellClass(sortField === "hitterOps")}>
                      OPS
                    </th>
                    <th className={getHeaderCellClass(sortField === "hitterWar")}>
                      WAR
                    </th>
                  </tr>
                ) : (
                  <tr>
                    <th className="w-14 px-3 py-2 text-center">순위</th>
                    <th className="px-3 py-2 text-left">선수</th>
                    <th className={getHeaderCellClass(sortField === "pitcherEra")}>
                      ERA
                    </th>
                    <th className="px-3 py-2 text-right">경기</th>
                    <th className={getHeaderCellClass(sortField === "pitcherWin")}>
                      승
                    </th>
                    <th className="px-3 py-2 text-right">패</th>
                    <th className={getHeaderCellClass(sortField === "pitcherSave")}>
                      세이브
                    </th>
                    <th className={getHeaderCellClass(sortField === "pitcherHold")}>
                      홀드
                    </th>
                    <th className="px-3 py-2 text-right">이닝</th>
                    <th className={getHeaderCellClass(sortField === "pitcherKk")}>
                      탈삼진
                    </th>
                    <th className={getHeaderCellClass(sortField === "pitcherWhip")}>
                      WHIP
                    </th>
                    <th className={getHeaderCellClass(sortField === "pitcherWar")}>
                      WAR
                    </th>
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredRecords.map((record) =>
                  recordType === "hitter" ? (
                    <HitterRow
                      key={record.playerId}
                      record={record}
                      sortField={sortField}
                    />
                  ) : (
                    <PitcherRow
                      key={record.playerId}
                      record={record}
                      sortField={sortField}
                    />
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

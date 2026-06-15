"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

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
    <section className="mx-auto max-w-7xl px-4 py-5">
      <div className="overflow-hidden rounded-sm border border-[#172554] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#172554] bg-[#071a3d] px-5 py-5 text-white md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f87171]">
              Records
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              선수 기록실
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              타자와 투수 주요 기록을 한 화면에서 비교하고, 선수명이나 팀으로 빠르게 찾아봅니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              className="h-10 rounded-sm border border-white/20 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => void loadRecords(true)}
              type="button"
            >
              {isLoading ? "불러오는 중" : "새로고침"}
            </button>
            <a
              className="inline-flex h-10 items-center rounded-sm bg-[#d71920] px-4 text-sm font-bold text-white hover:bg-[#a91118]"
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

        <div className="border-b border-[#d8deea] bg-[#f6f8fc] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex rounded-sm border border-[#c8d3df] bg-white p-1">
              <button
                className={[
                  "h-9 rounded-sm px-4 text-sm font-black",
                  recordType === "hitter"
                    ? "bg-[#2f4f9f] text-white"
                    : "text-[#667085] hover:bg-[#eef3ff]",
                ].join(" ")}
                onClick={() => handleChangeRecordType("hitter")}
                type="button"
              >
                타자 기록
              </button>
              <button
                className={[
                  "h-9 rounded-sm px-4 text-sm font-black",
                  recordType === "pitcher"
                    ? "bg-[#2f4f9f] text-white"
                    : "text-[#667085] hover:bg-[#eef3ff]",
                ].join(" ")}
                onClick={() => handleChangeRecordType("pitcher")}
                type="button"
              >
                투수 기록
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
              <select
                className="h-10 rounded-sm border border-[#c8d3df] bg-white px-2 text-sm font-bold text-[#202632] outline-none focus:border-[#2f4f9f]"
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
                className="h-10 rounded-sm border border-[#c8d3df] bg-white px-2 text-sm font-bold text-[#202632] outline-none focus:border-[#2f4f9f]"
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
                className="h-10 rounded-sm border border-[#c8d3df] bg-white px-2 text-sm font-bold text-[#202632] outline-none focus:border-[#2f4f9f]"
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
                className="h-10 rounded-sm border border-[#c8d3df] bg-white px-3 text-sm text-[#202632] outline-none focus:border-[#2f4f9f]"
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

        {message ? (
          <p className="border-b border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#b91c1c]">
            {message}
          </p>
        ) : null}

        {isLoading && !data ? (
          <div className="px-5 py-8 text-center text-sm text-[#667085]">
            선수 기록을 불러오는 중입니다.
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
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm text-[#344054]">
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

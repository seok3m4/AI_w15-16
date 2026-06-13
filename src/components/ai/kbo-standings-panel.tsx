"use client";

import { useEffect, useState } from "react";

type KboStandingRow = {
  rank: number;
  team: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winningRate: string;
  gamesBehind: string;
  lastTenGames: string;
  streak: string;
  homeRecord: string;
  awayRecord: string;
};

type KboStandingsResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: {
    source: string;
    fetchedAt: string;
    seasonYear: number;
    rows: KboStandingRow[];
  };
};

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function requestKboStandings(
  forceRefresh = false,
): Promise<KboStandingsResponse> {
  const params = new URLSearchParams();

  if (forceRefresh) {
    params.set("refresh", "true");
  }

  const query = params.toString();
  const response = await fetch(
    `/api/kbo/standings${query ? `?${query}` : ""}`,
    {
      credentials: "include",
    },
  );
  const responseData = (await response.json()) as KboStandingsResponse;

  if (!response.ok) {
    return {
      status: "unavailable",
      message: responseData.message ?? "KBO 순위를 불러오지 못했습니다.",
    };
  }

  return responseData;
}

export function KboStandingsPanel() {
  const [data, setData] = useState<KboStandingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadStandings(forceRefresh = false) {
    setIsLoading(true);

    try {
      setData(await requestKboStandings(forceRefresh));
    } catch {
      setData({
        status: "unavailable",
        message: "네트워크 연결을 확인해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialStandings() {
      try {
        const responseData = await requestKboStandings();

        if (isMounted) {
          setData(responseData);
        }
      } catch {
        if (isMounted) {
          setData({
            status: "unavailable",
            message: "네트워크 연결을 확인해주세요.",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialStandings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-sm border border-[#172554] bg-white">
      <div className="flex items-center justify-between border-b border-[#172554] bg-[#071a3d] px-3 py-2 text-white">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f87171]">
            Ranking
          </p>
          <h2 className="text-sm font-black">KBO 순위</h2>
        </div>
        <button
          className="text-xs font-bold text-white/70 hover:text-white hover:underline disabled:cursor-not-allowed disabled:text-white/35"
          disabled={isLoading}
          onClick={() => void loadStandings(true)}
          type="button"
        >
          새로고침
        </button>
      </div>

      {data?.result ? (
        <div className="border-b border-[#edf1f7] px-3 py-2 text-[11px] font-bold text-[#667085]">
          <div>{data.result.seasonYear} 정규시즌</div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span>{formatFetchedAt(data.result.fetchedAt)} 기준</span>
            <a
              className="shrink-0 text-[#2f4f9f] hover:underline"
              href={data.result.source}
              rel="noreferrer"
              target="_blank"
            >
              원문
            </a>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="px-3 py-4 text-xs text-[#667085]">
          KBO 순위를 불러오는 중입니다.
        </p>
      ) : null}

      {!isLoading && data?.message ? (
        <p className="m-2 rounded-sm border border-[#fecaca] bg-[#fff1f2] px-2 py-2 text-xs text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {!isLoading && data?.result ? (
        <ol className="divide-y divide-[#edf1f7]">
          {data.result.rows.map((row) => (
            <li className="flex gap-2 px-3 py-2" key={row.team}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[#2f4f9f] text-xs font-black text-white">
                {row.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-xs font-black text-[#202632]">
                    {row.team}
                  </p>
                  <span className="shrink-0 text-xs font-black text-[#1f3470]">
                    {row.winningRate}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[#667085]">
                  <span>
                    {row.wins}승 {row.draws}무 {row.losses}패
                  </span>
                  <span>GB {row.gamesBehind}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

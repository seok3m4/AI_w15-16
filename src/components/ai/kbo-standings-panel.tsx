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
    month: "long",
    day: "numeric",
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
    <section className="kbo-panel overflow-hidden">
      <div className="border-b border-[#d7dde8] bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d71920]">
              Standings
            </p>
            <h2 className="mt-1 text-base font-black text-[#071a3d]">
              현재 KBO 순위
            </h2>
          </div>
          <button
            className="rounded-md border border-[#d7dde8] px-2 py-1 text-xs font-black text-[#071a3d] hover:border-[#d71920] hover:text-[#d71920] disabled:cursor-not-allowed disabled:text-[#94a3b8]"
            disabled={isLoading}
            onClick={() => void loadStandings(true)}
            type="button"
          >
            새로고침
          </button>
        </div>

        {data?.result ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-[#64748b]">
            <span>{data.result.seasonYear} 정규시즌</span>
            <span>·</span>
            <span>{formatFetchedAt(data.result.fetchedAt)} 기준</span>
            <a
              className="font-black text-[#d71920] hover:underline"
              href={data.result.source}
              rel="noreferrer"
              target="_blank"
            >
              KBO 원문
            </a>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <p className="p-5 text-sm text-[#64748b]">KBO 순위를 불러오는 중입니다.</p>
      ) : null}

      {!isLoading && data?.message ? (
        <p className="m-5 rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {!isLoading && data?.result ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[300px] border-collapse text-left text-xs">
            <thead className="bg-[#f8fafc] text-[#64748b]">
              <tr>
                <th className="px-3 py-2 font-black">순위</th>
                <th className="px-3 py-2 font-black">팀</th>
                <th className="px-3 py-2 text-right font-black">승률</th>
                <th className="px-3 py-2 text-right font-black">게임차</th>
              </tr>
            </thead>
            <tbody>
              {data.result.rows.map((row) => (
                <tr
                  className="border-t border-[#e5eaf1] align-top"
                  key={row.team}
                >
                  <td className="px-3 py-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#071a3d] px-1.5 text-xs font-black text-white">
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-black text-[#071a3d]">{row.team}</p>
                    <p className="mt-1 text-[11px] font-bold text-[#64748b]">
                      {row.wins}승 {row.losses}패 {row.draws}무
                    </p>
                    <p className="mt-1 text-[11px] text-[#64748b]">
                      최근 {row.lastTenGames} · {row.streak}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right font-black text-[#071a3d]">
                    {row.winningRate}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-[#64748b]">
                    {row.gamesBehind}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import type { KboGame } from "@/lib/kbo/game";
import { useEffect, useMemo, useState } from "react";

type KboLineupBatter = {
  batOrder: number;
  position: string;
  name: string;
  war: number | null;
};

type KboTeamLineup = {
  team: string;
  batters: KboLineupBatter[];
  totalWar: number | null;
  coreWar: number | null;
};

type KboLineupResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: {
    source: string;
    lineupReady: boolean;
    away: KboTeamLineup | null;
    home: KboTeamLineup | null;
  };
};

type KboLineupPanelProps = {
  game: KboGame;
};

function formatWar(value: number | null): string {
  return value === null ? "-" : value.toFixed(2);
}

function LineupTable({ lineup }: { lineup: KboTeamLineup | null }) {
  if (!lineup) {
    return (
      <div className="rounded-sm border border-[#edf1f7] bg-[#f8fafc] p-3 text-sm text-[#667085]">
        라인업 공개 전입니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-[#d8deea] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#edf1f7] bg-[#f8fafc] px-3 py-2">
        <h3 className="text-sm font-black text-[#1f3470]">{lineup.team}</h3>
        <span className="text-xs font-bold text-[#667085]">
          WAR {formatWar(lineup.totalWar)}
        </span>
      </div>
      <div className="divide-y divide-[#edf1f7]">
        {lineup.batters.map((batter) => (
          <div
            className="grid grid-cols-[32px_64px_minmax(0,1fr)_52px] items-center gap-2 px-3 py-2 text-sm"
            key={`${lineup.team}-${batter.batOrder}-${batter.name}`}
          >
            <span className="font-black text-[#d71920]">{batter.batOrder}</span>
            <span className="text-xs font-bold text-[#667085]">
              {batter.position || "-"}
            </span>
            <span className="truncate font-bold text-[#202632]">
              {batter.name}
            </span>
            <span className="text-right text-xs font-bold text-[#667085]">
              {formatWar(batter.war)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KboLineupPanel({ game }: KboLineupPanelProps) {
  const [data, setData] = useState<KboLineupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const queryString = useMemo(() => {
    if (!game.gameId) {
      return "";
    }

    return new URLSearchParams({
      gameId: game.gameId,
      gameDate: game.gameDate,
      awayTeam: game.awayTeam,
      homeTeam: game.homeTeam,
    }).toString();
  }, [game.awayTeam, game.gameDate, game.gameId, game.homeTeam]);

  useEffect(() => {
    if (!queryString) {
      return;
    }

    let isMounted = true;

    async function loadLineup() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/kbo/lineup?${queryString}`, {
          cache: "no-store",
          credentials: "include",
        });
        const responseData = (await response.json()) as KboLineupResponse;

        if (!isMounted) {
          return;
        }

        setData(responseData);
      } catch {
        if (isMounted) {
          setData({
            status: "unavailable",
            message: "라인업을 불러오지 못했습니다.",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLineup();

    return () => {
      isMounted = false;
    };
  }, [queryString]);

  return (
    <section className="mt-4 rounded-sm border border-[#b9c3d7] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#d8deea] bg-[#f6f8fc] px-3 py-2">
        <div>
          <h2 className="text-sm font-black text-[#1f3470]">라인업</h2>
          <p className="mt-1 text-xs text-[#667085]">
            KBO 공식 경기센터의 선발 타순과 WAR를 확인합니다.
          </p>
        </div>
        {data?.result?.source ? (
          <a
            className="shrink-0 rounded-sm border border-[#b9c3d7] bg-white px-2 py-1 text-xs font-bold text-[#1f3470] hover:bg-[#eef3ff]"
            href={data.result.source}
            rel="noreferrer"
            target="_blank"
          >
            원문
          </a>
        ) : null}
      </div>

      {isLoading ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          라인업을 불러오는 중입니다.
        </p>
      ) : null}

      {!isLoading && !queryString ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          라인업 조회에 필요한 gameId가 없습니다.
        </p>
      ) : null}

      {!isLoading && data?.message ? (
        <p className="px-3 py-4 text-sm text-[#667085]">{data.message}</p>
      ) : null}

      {!isLoading && data?.result && !data.result.lineupReady ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          아직 공식 라인업이 공개되지 않았습니다.
        </p>
      ) : null}

      {!isLoading && data?.result?.lineupReady ? (
        <div className="grid gap-3 p-3 md:grid-cols-2">
          <LineupTable lineup={data.result.away} />
          <LineupTable lineup={data.result.home} />
        </div>
      ) : null}
    </section>
  );
}

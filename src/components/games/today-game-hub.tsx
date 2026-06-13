"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  type KboGame,
  getGameRoomHref,
  getScoreText,
  getStatusLabel,
  getTodayInputValue,
} from "@/lib/kbo/game";

type KboGamesResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: {
    date: string;
    team: string | null;
    source: string;
    games: KboGame[];
  };
};

type TodayGameHubProps = {
  selectedTeam: string;
  onSelectTeam: (teamName: string) => void;
};

function getStartingPitcherText(game: KboGame): string {
  return [
    game.awayStartingPitcher
      ? `${game.awayTeam} ${game.awayStartingPitcher.name}`
      : "",
    game.homeStartingPitcher
      ? `${game.homeTeam} ${game.homeStartingPitcher.name}`
      : "",
  ]
    .filter(Boolean)
    .join(" vs ");
}

function getDecisionPitcherText(game: KboGame): string {
  if (game.status === "scheduled") {
    return "";
  }

  return [
    game.winningPitcher ? `승 ${game.winningPitcher.name}` : "",
    game.losingPitcher ? `패 ${game.losingPitcher.name}` : "",
    game.savePitcher ? `세 ${game.savePitcher.name}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function TodayGameHub({
  selectedTeam,
  onSelectTeam,
}: TodayGameHubProps) {
  const [date, setDate] = useState(getTodayInputValue);
  const [data, setData] = useState<KboGamesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ date });

    if (selectedTeam) {
      params.set("team", selectedTeam);
    }

    return params.toString();
  }, [date, selectedTeam]);

  useEffect(() => {
    let isMounted = true;

    async function loadGames() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/ai/mcp/kbo-games?${queryString}`, {
          cache: "no-store",
          credentials: "include",
        });
        const responseData = (await response.json()) as KboGamesResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setData({
            status: "unavailable",
            message:
              responseData.message ?? "경기 일정을 불러오지 못했습니다.",
          });
          return;
        }

        setData(responseData);
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

    void loadGames();

    return () => {
      isMounted = false;
    };
  }, [queryString]);

  const games = data?.result?.games ?? [];

  return (
    <section className="overflow-hidden rounded-sm border border-[#b9c3d7] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#d8deea] bg-[#f6f8fc] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-black text-[#1f3470]">오늘의 경기</h2>
          <p className="mt-1 text-xs text-[#667085]">
            경기방에서 관련 글과 팬 반응을 한 번에 볼 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="h-9 rounded-sm border border-[#c8d3df] bg-white px-2 text-sm outline-none focus:border-[#2f4f9f]"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
          {data?.result?.source ? (
            <a
              className="inline-flex h-9 items-center rounded-sm border border-[#b9c3d7] bg-white px-3 text-xs font-bold text-[#1f3470] hover:bg-[#eef3ff]"
              href={data.result.source}
              rel="noreferrer"
              target="_blank"
            >
              KBO 원문
            </a>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 py-6 text-center text-sm text-[#667085]">
          경기 일정을 불러오는 중입니다.
        </div>
      ) : null}

      {!isLoading && data?.message ? (
        <p className="mx-4 my-3 rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {!isLoading && !data?.message && games.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-[#667085]">
          선택한 날짜의 경기 일정이 없습니다.
        </div>
      ) : null}

      {!isLoading && games.length > 0 ? (
        <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => {
            const startingPitcherText = getStartingPitcherText(game);
            const decisionPitcherText = getDecisionPitcherText(game);

            return (
              <article
                className="rounded-sm border border-[#d8deea] bg-white p-3 hover:border-[#2f4f9f]"
                key={`${game.gameDate}-${game.awayTeam}-${game.homeTeam}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-sm bg-[#eef3ff] px-2 py-1 text-xs font-black text-[#2f4f9f]">
                    {getStatusLabel(game.status)}
                  </span>
                  <span className="text-xs font-bold text-[#667085]">
                    {game.time || "시간 미정"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <button
                    className="truncate text-left text-sm font-black text-[#1f3470] hover:underline"
                    onClick={() => onSelectTeam(game.awayTeam)}
                    type="button"
                  >
                    {game.awayTeam}
                  </button>
                  <span className="rounded-sm bg-[#202632] px-2 py-1 text-sm font-black text-white">
                    {getScoreText(game)}
                  </span>
                  <button
                    className="truncate text-right text-sm font-black text-[#1f3470] hover:underline"
                    onClick={() => onSelectTeam(game.homeTeam)}
                    type="button"
                  >
                    {game.homeTeam}
                  </button>
                </div>

                <p className="mt-2 truncate text-xs text-[#667085]">
                  {[game.stadium, game.tv, game.note]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                {startingPitcherText ? (
                  <p className="mt-1 truncate text-xs font-bold text-[#202632]">
                    선발 {startingPitcherText}
                  </p>
                ) : null}

                {decisionPitcherText ? (
                  <p className="mt-1 truncate text-xs font-bold text-[#d71920]">
                    {decisionPitcherText}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    className="inline-flex h-8 items-center rounded-sm bg-[#2f4f9f] px-3 text-xs font-black text-white hover:bg-[#1f3470]"
                    href={getGameRoomHref(game)}
                  >
                    경기방
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

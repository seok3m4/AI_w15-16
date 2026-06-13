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
  if (game.status === "scheduled" || game.status === "live") {
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

function getRunnerText(game: KboGame): string {
  const liveState = game.liveState;

  if (!liveState) {
    return "";
  }

  const bases = [
    liveState.firstBaseOccupied ? "1루" : "",
    liveState.secondBaseOccupied ? "2루" : "",
    liveState.thirdBaseOccupied ? "3루" : "",
  ].filter(Boolean);

  return bases.length > 0 ? `주자 ${bases.join(", ")}` : "주자 없음";
}

function getLiveStateText(game: KboGame): string {
  const liveState = game.liveState;

  if (!liveState) {
    return "";
  }

  const inning = liveState.inning
    ? `${liveState.inning}회 ${liveState.inningHalf || ""}`.trim()
    : "";
  const count = [
    liveState.balls !== null ? `B${liveState.balls}` : "",
    liveState.strikes !== null ? `S${liveState.strikes}` : "",
    liveState.outs !== null ? `O${liveState.outs}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const runnerText = getRunnerText(game);

  return [inning, count, runnerText].filter(Boolean).join(" · ");
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

    async function loadGames(silent = false) {
      if (!silent) {
        setIsLoading(true);
      }

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
        if (isMounted && !silent) {
          setIsLoading(false);
        }
      }
    }

    void loadGames();
    const shouldPollLiveScores = date === getTodayInputValue();
    const intervalId = shouldPollLiveScores
      ? window.setInterval(() => void loadGames(true), 15_000)
      : null;

    return () => {
      isMounted = false;

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [date, queryString]);

  const games = data?.result?.games ?? [];

  return (
    <section className="overflow-hidden rounded-sm border border-[#172554] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#172554] bg-[#071a3d] px-4 py-3 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f87171]">
            Scoreboard
          </p>
          <h2 className="mt-0.5 text-lg font-black">오늘의 경기</h2>
          <p className="mt-1 text-xs text-white/70">
            일정, 선발투수, 경기방을 한 번에 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="h-9 rounded-sm border border-white/20 bg-white px-2 text-sm text-[#071a3d] outline-none focus:border-white"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
          {data?.result?.source ? (
            <a
              className="inline-flex h-9 items-center rounded-sm border border-white/20 bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20"
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
        <div className="grid gap-2 bg-[#eef2f7] p-2 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => {
            const startingPitcherText = getStartingPitcherText(game);
            const decisionPitcherText = getDecisionPitcherText(game);

            return (
              <article
                className="overflow-hidden rounded-sm border border-[#c8d3df] bg-white hover:border-[#2f4f9f]"
                key={`${game.gameDate}-${game.awayTeam}-${game.homeTeam}`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#edf1f7] bg-[#f8fafc] px-3 py-2">
                  <span className="rounded-sm bg-[#d71920] px-2 py-1 text-xs font-black text-white">
                    {getStatusLabel(game.status)}
                  </span>
                  <span className="truncate text-xs font-bold text-[#667085]">
                    {[game.time || "시간 미정", game.stadium]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>

                <div className="grid min-h-20 grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] items-center gap-2 px-3 py-3">
                  <button
                    className="truncate text-left text-base font-black text-[#071a3d] hover:text-[#2f4f9f] hover:underline"
                    onClick={() => onSelectTeam(game.awayTeam)}
                    type="button"
                  >
                    {game.awayTeam}
                  </button>
                  <span className="flex h-10 items-center justify-center rounded-sm bg-[#202632] px-2 text-sm font-black text-white">
                    {getScoreText(game)}
                  </span>
                  <button
                    className="truncate text-right text-base font-black text-[#071a3d] hover:text-[#2f4f9f] hover:underline"
                    onClick={() => onSelectTeam(game.homeTeam)}
                    type="button"
                  >
                    {game.homeTeam}
                  </button>
                </div>

                {game.status === "live" && getLiveStateText(game) ? (
                  <div className="border-t border-[#edf1f7] bg-[#fff7ed] px-3 py-2">
                    <p className="truncate text-xs font-black text-[#b45309]">
                      {getLiveStateText(game)}
                    </p>
                  </div>
                ) : null}

                <div className="space-y-1 border-t border-[#edf1f7] px-3 py-2">
                  {startingPitcherText ? (
                    <p className="truncate text-xs font-bold text-[#202632]">
                      <span className="mr-1 text-[#667085]">선발</span>
                      {startingPitcherText}
                    </p>
                  ) : null}

                  {decisionPitcherText ? (
                    <p className="truncate text-xs font-bold text-[#d71920]">
                      <span className="mr-1 text-[#667085]">기록</span>
                      {decisionPitcherText}
                    </p>
                  ) : null}

                  {!startingPitcherText && !decisionPitcherText ? (
                    <p className="text-xs text-[#667085]">
                      투수 정보 업데이트 전입니다.
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-[#edf1f7] px-3 py-2">
                  <p className="min-w-0 truncate text-xs text-[#667085]">
                    {[game.tv, game.note].filter(Boolean).join(" · ") || "중계 정보 미정"}
                  </p>
                  <Link
                    className="inline-flex h-8 shrink-0 items-center rounded-sm bg-[#2f4f9f] px-3 text-xs font-black text-white hover:bg-[#1f3470]"
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

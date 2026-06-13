"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import {
  type KboGame,
  type KboGameStatus,
  getGameRoomHref,
  getWriteReviewHref,
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

const teams = ["", "LG", "한화", "SSG", "삼성", "NC", "KT", "롯데", "KIA", "두산", "키움"];

function getTodayInputValue(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getStatusLabel(status: KboGameStatus): string {
  if (status === "scheduled") {
    return "예정";
  }

  if (status === "live") {
    return "진행중";
  }

  if (status === "draw") {
    return "무승부";
  }

  return "종료";
}

function getScoreText(game: KboGame): string {
  if (game.awayScore === null || game.homeScore === null) {
    return "경기 전";
  }

  return `${game.awayScore} : ${game.homeScore}`;
}

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

export function KboGamesPanel() {
  const [date, setDate] = useState(getTodayInputValue);
  const [team, setTeam] = useState("");
  const [data, setData] = useState<KboGamesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setData(null);

    try {
      const response = await fetch("/api/ai/mcp/kbo-games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          date,
          team,
        }),
      });
      const responseData = (await response.json()) as KboGamesResponse;

      if (!response.ok) {
        setData({
          status: "unavailable",
          message:
            responseData.message ?? "KBO 경기 데이터를 불러오지 못했습니다.",
        });
        return;
      }

      setData(responseData);
    } catch {
      setData({
        status: "unavailable",
        message: "네트워크 연결을 확인해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="kbo-panel overflow-hidden">
      <div className="border-b border-[#d7dde8] bg-white px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d71920]">
          Game Data
        </p>
        <h2 className="mt-1 text-base font-black text-[#071a3d]">
          KBO 공식 경기 데이터
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#64748b]">
          KBO 공식 일정/결과 데이터를 조회합니다.
        </p>
      </div>

      <form className="grid gap-3 bg-[#f8fafc] p-5" onSubmit={handleSubmit}>
        <input
          className="h-10 rounded-md border border-[#c8d3df] bg-white px-3 text-sm outline-none focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/10"
          onChange={(event) => setDate(event.target.value)}
          type="date"
          value={date}
        />

        <select
          className="h-10 rounded-md border border-[#c8d3df] bg-white px-3 text-sm outline-none focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/10"
          onChange={(event) => setTeam(event.target.value)}
          value={team}
        >
          {teams.map((teamName) => (
            <option key={teamName || "all"} value={teamName}>
              {teamName || "전체 팀"}
            </option>
          ))}
        </select>

        <button
          className="h-10 rounded-md bg-[#071a3d] px-4 text-sm font-bold text-white hover:bg-[#102a56] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading || !date}
          type="submit"
        >
          {isLoading ? "경기 조회 중" : "경기 조회"}
        </button>
      </form>

      {data?.message ? (
        <p className="mx-5 mt-4 rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {data?.result ? (
        <div className="space-y-3 p-5 pt-4">
          <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#64748b]">
            <span>
              {data.result.date}
              {data.result.team ? ` · ${data.result.team}` : ""}
            </span>
            <a
              className="font-black text-[#d71920] hover:underline"
              href={data.result.source}
              rel="noreferrer"
              target="_blank"
            >
              KBO 출처
            </a>
          </div>

          {data.result.games.length > 0 ? (
            <div className="grid gap-2">
              {data.result.games.map((game) => (
                <article
                  className="rounded-md border border-[#d7dde8] bg-white p-3"
                  key={`${game.gameDate}-${game.awayTeam}-${game.homeTeam}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#071a3d]">
                      {game.awayTeam} vs {game.homeTeam}
                    </p>
                    <span className="rounded-md bg-[#fff1f2] px-2 py-1 text-xs font-black text-[#d71920]">
                      {getStatusLabel(game.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#64748b]">
                    {game.time} · {getScoreText(game)}
                    {game.stadium ? ` · ${game.stadium}` : ""}
                  </p>
                  {game.tv || game.note ? (
                    <p className="mt-1 text-xs text-[#64748b]">
                      {[game.tv, game.note].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {getStartingPitcherText(game) ? (
                    <p className="mt-1 text-xs font-bold text-[#071a3d]">
                      선발 {getStartingPitcherText(game)}
                    </p>
                  ) : null}
                  {getDecisionPitcherText(game) ? (
                    <p className="mt-1 text-xs font-bold text-[#d71920]">
                      {getDecisionPitcherText(game)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                    <Link
                      className="rounded-sm bg-[#071a3d] px-2 py-1 text-white hover:bg-[#102a56]"
                      href={getGameRoomHref(game)}
                    >
                      경기방
                    </Link>
                    <Link
                      className="rounded-sm border border-[#d7dde8] bg-white px-2 py-1 text-[#071a3d] hover:border-[#d71920] hover:text-[#d71920]"
                      href={getWriteReviewHref(game)}
                    >
                      리뷰 쓰기
                    </Link>
                    {game.reviewUrl ? (
                      <a
                        className="rounded-sm border border-[#d7dde8] bg-white px-2 py-1 text-[#d71920] hover:bg-[#fff1f2]"
                        href={game.reviewUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        리뷰
                      </a>
                    ) : null}
                    {game.highlightUrl ? (
                      <a
                        className="rounded-sm border border-[#d7dde8] bg-white px-2 py-1 text-[#d71920] hover:bg-[#fff1f2]"
                        href={game.highlightUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        하이라이트
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-[#d7dde8] bg-[#f8fafc] p-3 text-sm text-[#64748b]">
              선택한 조건의 KBO 경기 일정/결과가 없습니다.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

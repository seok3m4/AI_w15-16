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
    <section className="community-panel overflow-hidden">
      <div className="community-panel-header">
        <div>
          <p className="text-[11px] font-black tracking-[0.12em] text-[#d71920]">
            경기 정보
          </p>
          <h2 className="mt-1 text-base font-black text-[#071a3d]">
          KBO 공식 경기 데이터
        </h2>
          <p className="mt-0.5 text-xs leading-5 text-[#667085]">
          KBO 공식 일정/결과 데이터를 조회합니다.
          </p>
        </div>
        <span className="community-chip">KBO</span>
      </div>

      <form className="grid gap-3 p-4" onSubmit={handleSubmit}>
        <input
          className="community-input text-sm"
          onChange={(event) => setDate(event.target.value)}
          type="date"
          value={date}
        />

        <select
          className="community-input text-sm"
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
          className="community-button-primary px-4"
          disabled={isLoading || !date}
          type="submit"
        >
          {isLoading ? "경기 조회 중" : "경기 조회"}
        </button>
      </form>

      {data?.message ? (
        <p className="mx-4 mt-1 rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {data?.result ? (
        <div className="space-y-3 p-4 pt-1">
          <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#64748b]">
            <span>
              {data.result.date}
              {data.result.team ? ` · ${data.result.team}` : ""}
            </span>
            <a
              className="community-chip community-chip-link px-2"
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
                  className="community-subpanel bg-white p-3"
                  key={`${game.gameDate}-${game.awayTeam}-${game.homeTeam}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#071a3d]">
                      {game.awayTeam} vs {game.homeTeam}
                    </p>
                    <span className="community-chip community-chip-accent px-2">
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
                      className="community-button-primary community-button-compact"
                      href={getGameRoomHref(game)}
                    >
                      경기방
                    </Link>
                    <Link
                      className="community-button-secondary community-button-compact"
                      href={getWriteReviewHref(game)}
                    >
                      리뷰 쓰기
                    </Link>
                    {game.reviewUrl ? (
                      <a
                        className="community-button-secondary community-button-compact text-[#d71920] hover:bg-[#fff1f2] hover:text-[#d71920]"
                        href={game.reviewUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        리뷰
                      </a>
                    ) : null}
                    {game.highlightUrl ? (
                      <a
                        className="community-button-secondary community-button-compact text-[#d71920] hover:bg-[#fff1f2] hover:text-[#d71920]"
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
            <p className="community-subpanel p-3 text-sm text-[#64748b]">
              선택한 조건의 KBO 경기 일정/결과가 없습니다.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

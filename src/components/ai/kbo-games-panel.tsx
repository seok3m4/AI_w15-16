"use client";

import { FormEvent, useState } from "react";

type KboGameStatus = "scheduled" | "completed" | "draw";

type KboGame = {
  gameDate: string;
  displayDate: string;
  time: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  status: KboGameStatus;
  stadium: string;
  tv: string;
  note: string;
  reviewUrl: string | null;
  highlightUrl: string | null;
};

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
    <section className="rounded-md border border-[#d9e2ec] bg-white p-5">
      <div className="border-b border-[#d9e2ec] pb-3">
        <h2 className="text-base font-semibold">KBO 공식 경기 데이터</h2>
        <p className="mt-1 text-sm leading-6 text-[#5e6a7d]">
          KBO 공식 일정/결과 데이터를 MCP 도구로 조회합니다.
        </p>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <input
          className="h-10 rounded-md border border-[#c8d3df] bg-white px-3 text-sm outline-none focus:border-[#0f766e]"
          onChange={(event) => setDate(event.target.value)}
          type="date"
          value={date}
        />

        <select
          className="h-10 rounded-md border border-[#c8d3df] bg-white px-3 text-sm outline-none focus:border-[#0f766e]"
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
          className="h-10 rounded-md bg-[#172033] px-4 text-sm font-semibold text-white hover:bg-[#2b3548] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading || !date}
          type="submit"
        >
          {isLoading ? "경기 조회 중" : "경기 조회"}
        </button>
      </form>

      {data?.message ? (
        <p className="mt-4 rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {data?.result ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-[#5e6a7d]">
            <span>
              {data.result.date}
              {data.result.team ? ` · ${data.result.team}` : ""}
            </span>
            <a
              className="font-semibold text-[#0f766e] hover:underline"
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
                  className="rounded-md border border-[#d9e2ec] bg-[#fbfcfd] p-3"
                  key={`${game.gameDate}-${game.awayTeam}-${game.homeTeam}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#172033]">
                      {game.awayTeam} vs {game.homeTeam}
                    </p>
                    <span className="rounded-md bg-[#e6f4f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                      {getStatusLabel(game.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#5e6a7d]">
                    {game.time} · {getScoreText(game)}
                    {game.stadium ? ` · ${game.stadium}` : ""}
                  </p>
                  {game.tv || game.note ? (
                    <p className="mt-1 text-xs text-[#718096]">
                      {[game.tv, game.note].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  <div className="mt-2 flex gap-3 text-xs font-semibold text-[#0f766e]">
                    {game.reviewUrl ? (
                      <a href={game.reviewUrl} rel="noreferrer" target="_blank">
                        리뷰
                      </a>
                    ) : null}
                    {game.highlightUrl ? (
                      <a
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
            <p className="rounded-md border border-[#d9e2ec] bg-[#fbfcfd] p-3 text-sm text-[#5e6a7d]">
              선택한 조건의 KBO 경기 일정/결과가 없습니다.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

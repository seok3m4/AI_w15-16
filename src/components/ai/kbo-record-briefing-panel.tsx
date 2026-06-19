"use client";

import { useState } from "react";

import type { KboGame } from "@/lib/kbo/game";
import { getScoreText } from "@/lib/kbo/game";

type KboRecordBriefing = {
  gameId: string | null;
  gameDate: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  status: "scheduled" | "live" | "completed" | "draw";
  stadium: string;
  sourceUrl: string | null;
  sourceType: "review" | "highlight" | "schedule";
  officialSummary: string;
  recordItems: string[];
  officialExcerpt: string;
};

type KboRecordBriefingResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: KboRecordBriefing;
};

type KboRecordBriefingPanelProps = {
  game: KboGame;
};

function getSourceLabel(sourceType: KboRecordBriefing["sourceType"]): string {
  if (sourceType === "review") {
    return "KBO 리뷰";
  }

  if (sourceType === "highlight") {
    return "KBO 하이라이트";
  }

  return "KBO 일정";
}

export function KboRecordBriefingPanel({
  game,
}: KboRecordBriefingPanelProps) {
  const [data, setData] = useState<KboRecordBriefingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  async function handleCreateBriefing() {
    setIsLoading(true);
    setHasRequested(true);
    setData(null);

    try {
      const response = await fetch("/api/ai/mcp/kbo-game-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          gameId: game.gameId,
          gameDate: game.gameDate,
          awayTeam: game.awayTeam,
          homeTeam: game.homeTeam,
          awayScore: game.awayScore,
          homeScore: game.homeScore,
          status: game.status,
          stadium: game.stadium,
          reviewUrl: game.reviewUrl,
          highlightUrl: game.highlightUrl,
        }),
      });
      const responseData =
        (await response.json()) as KboRecordBriefingResponse;

      if (!response.ok) {
        setData({
          status: "unavailable",
          message:
            responseData.message ?? "경기 기록을 정리하지 못했습니다.",
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
    <section className="community-panel mt-4">
      <div className="community-panel-header">
        <div>
          <h2 className="text-sm font-black text-[#1f3470]">
            경기 기록 포인트
          </h2>
          <p className="mt-1 text-xs text-[#667085]">
            공식 기록 기준으로 승부 포인트를 확인합니다.
          </p>
        </div>
        <button
          className="community-button-primary community-button-compact disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading}
          onClick={() => void handleCreateBriefing()}
          type="button"
        >
          {isLoading
            ? "조회 중"
            : hasRequested
              ? "다시 조회"
              : "기록 포인트 보기"}
        </button>
      </div>

      {!hasRequested ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          {getScoreText(game)} 기준으로 기록 포인트를 확인합니다.
        </p>
      ) : null}

      {isLoading ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          경기 기록을 확인하는 중입니다.
        </p>
      ) : null}

      {!isLoading && data?.message ? (
        <p className="mx-3 mt-3 rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {!isLoading && data?.result ? (
        <div className="space-y-3 px-3 py-4">
          <div className="community-subpanel bg-[#fbfcff] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-[#667085]">
                {getSourceLabel(data.result.sourceType)}
              </span>
              {data.result.sourceUrl ? (
                <a
                  className="text-xs font-black text-[#2f4f9f] hover:underline"
                  href={data.result.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  원문 보기
                </a>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#202632]">
              {data.result.officialSummary}
            </p>
          </div>

          {data.result.recordItems.length > 0 ? (
            <div className="grid gap-2">
              {data.result.recordItems.map((item, index) => (
                <p
                  className="community-subpanel bg-white px-3 py-2 text-sm leading-6 text-[#202632]"
                  key={`${item}-${index}`}
                >
                  {item}
                </p>
              ))}
            </div>
          ) : null}

          {data.result.recordItems.length === 0 &&
          data.result.officialExcerpt ? (
            <p className="community-subpanel bg-white px-3 py-2 text-sm leading-6 text-[#667085]">
              {data.result.officialExcerpt}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

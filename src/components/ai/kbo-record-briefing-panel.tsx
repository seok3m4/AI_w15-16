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
  status: "scheduled" | "completed" | "draw";
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
            responseData.message ?? "공식 기록 브리핑을 생성하지 못했습니다.",
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
    <section className="mt-4 rounded-sm border border-[#b9c3d7] bg-white">
      <div className="flex flex-col gap-2 border-b border-[#d8deea] bg-[#f6f8fc] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-[#1f3470]">
            공식 기록 브리핑
          </h2>
          <p className="mt-1 text-xs text-[#667085]">
            KBO 공식 기록 페이지를 MCP로 조회해 경기 포인트를 정리합니다.
          </p>
        </div>
        <button
          className="h-9 rounded-sm bg-[#2f4f9f] px-3 text-xs font-black text-white hover:bg-[#1f3470] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading}
          onClick={() => void handleCreateBriefing()}
          type="button"
        >
          {isLoading
            ? "조회 중"
            : hasRequested
              ? "다시 조회"
              : "공식 기록 보기"}
        </button>
      </div>

      {!hasRequested ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          현재 스코어는 {getScoreText(game)}입니다. 버튼을 누르면 KBO 공식
          리뷰/하이라이트 링크를 기준으로 기록을 조회합니다.
        </p>
      ) : null}

      {isLoading ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          KBO 공식 기록을 가져오는 중입니다.
        </p>
      ) : null}

      {!isLoading && data?.message ? (
        <p className="mx-3 mt-3 rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {!isLoading && data?.result ? (
        <div className="space-y-3 px-3 py-4">
          <div className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3">
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
                  className="rounded-sm border border-[#d8deea] bg-white px-3 py-2 text-sm leading-6 text-[#202632]"
                  key={`${item}-${index}`}
                >
                  {item}
                </p>
              ))}
            </div>
          ) : null}

          {data.result.recordItems.length === 0 &&
          data.result.officialExcerpt ? (
            <p className="rounded-sm border border-[#d8deea] bg-white px-3 py-2 text-sm leading-6 text-[#667085]">
              {data.result.officialExcerpt}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import type { KboGame } from "@/lib/kbo/game";
import { useState } from "react";

type GamePrediction = {
  predictedTeam: string;
  confidence: "낮음" | "보통" | "높음";
  awayWinProbability: number;
  homeWinProbability: number;
  summary: string;
  factors: string[];
  caveats: string[];
  lineupApplied: boolean;
  lineupSummary: string[];
  modelUsed: boolean;
  standingsSource: string;
};

type PredictionResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: GamePrediction;
};

type GamePredictionPanelProps = {
  game: KboGame;
};

function getProbabilityWidth(value: number): string {
  return `${Math.min(Math.max(value, 0), 100)}%`;
}

export function GamePredictionPanel({ game }: GamePredictionPanelProps) {
  const [data, setData] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  async function handlePredictGame() {
    setIsLoading(true);
    setHasRequested(true);
    setData(null);

    try {
      const response = await fetch("/api/ai/prediction/game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          game,
        }),
      });
      const responseData = (await response.json()) as PredictionResponse;

      setData(responseData);
    } catch {
      setData({
        status: "unavailable",
        message: "승부 예측을 생성하지 못했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="community-panel mt-4">
      <div className="community-panel-header community-panel-header-stack">
        <div>
          <h2 className="text-sm font-black text-[#1f3470]">승부 예측</h2>
          <p className="mt-1 text-xs text-[#667085]">
            순위, 선발, 라인업 기준 관전 포인트
          </p>
        </div>
        <button
          className="community-button-primary shrink-0 px-3 text-xs"
          disabled={isLoading}
          onClick={() => void handlePredictGame()}
          type="button"
        >
          {isLoading
            ? "예측 중"
            : hasRequested
              ? "다시 예측"
              : "승부 예측"}
        </button>
      </div>

      {!hasRequested ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          경기 전력과 공개된 라인업을 기준으로 참고용 예측을 봅니다.
        </p>
      ) : null}

      {isLoading ? (
        <p className="px-3 py-4 text-sm text-[#667085]">
          양 팀 데이터를 비교하는 중입니다.
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
              <div>
                <p className="text-xs font-black text-[#667085]">예측 우세</p>
                <p className="mt-1 text-xl font-black text-[#d71920]">
                  {data.result.predictedTeam}
                </p>
              </div>
              <span className="community-chip community-chip-dark">
                신뢰도 {data.result.confidence}
              </span>
              <span
                className={[
                  "community-chip",
                  data.result.lineupApplied
                    ? "community-chip-success"
                    : "community-chip-muted",
                ].join(" ")}
              >
                {data.result.lineupApplied ? "라인업 반영" : "라인업 미공개"}
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              <div>
                <div className="mb-1 flex justify-between text-xs font-black text-[#667085]">
                  <span>{game.awayTeam}</span>
                  <span>{data.result.awayWinProbability}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-sm bg-[#e5eaf2]">
                  <div
                    className="h-full bg-[#2f4f9f]"
                    style={{
                      width: getProbabilityWidth(
                        data.result.awayWinProbability,
                      ),
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-black text-[#667085]">
                  <span>{game.homeTeam}</span>
                  <span>{data.result.homeWinProbability}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-sm bg-[#e5eaf2]">
                  <div
                    className="h-full bg-[#d71920]"
                    style={{
                      width: getProbabilityWidth(
                        data.result.homeWinProbability,
                      ),
                    }}
                  />
                </div>
              </div>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#202632]">
              {data.result.summary}
            </p>
          </div>

          {data.result.lineupSummary.length > 0 ? (
            <div className="community-subpanel bg-white p-3">
              <p className="text-xs font-black text-[#667085]">라인업 반영</p>
              <div className="mt-2 grid gap-1.5">
                {data.result.lineupSummary.map((lineup) => (
                  <p
                    className="text-sm leading-6 text-[#202632]"
                    key={lineup}
                  >
                    - {lineup}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="community-subpanel bg-white p-3">
              <p className="text-xs font-black text-[#667085]">근거</p>
              <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-[#202632]">
                {data.result.factors.map((factor) => (
                  <li key={factor}>- {factor}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-sm border border-[#fde68a] bg-[#fffbeb] p-3">
              <p className="text-xs font-black text-[#92400e]">주의</p>
              <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-[#92400e]">
                {data.result.caveats.map((caveat) => (
                  <li key={caveat}>- {caveat}</li>
                ))}
              </ul>
              <p className="mt-3 border-t border-[#f5d48f] pt-3 text-xs font-bold text-[#92400e]">
                {data.result.modelUsed
                  ? "자료를 바탕으로 관전 포인트를 정리했습니다."
                  : "현재는 계산 기반 참고 문장을 사용했습니다."}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

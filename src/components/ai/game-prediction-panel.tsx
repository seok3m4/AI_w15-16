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
    <section className="mt-4 rounded-sm border border-[#b9c3d7] bg-white">
      <div className="flex flex-col gap-2 border-b border-[#d8deea] bg-[#f6f8fc] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-[#1f3470]">승부 예측</h2>
          <p className="mt-1 text-xs text-[#667085]">
            순위, 최근 흐름, 홈원정, 선발, 공개된 타자 라인업을 바탕으로 경기 관전 포인트를 예측합니다.
          </p>
        </div>
        <button
          className="h-9 rounded-sm bg-[#2f4f9f] px-3 text-xs font-black text-white hover:bg-[#1f3470] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
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
          버튼을 누르면 KBO 공식 순위, 경기 데이터, 공개된 타자 라인업을 기준으로 예측을 생성합니다.
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
          <div className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-[#667085]">예측 우세</p>
                <p className="mt-1 text-xl font-black text-[#d71920]">
                  {data.result.predictedTeam}
                </p>
              </div>
              <span className="rounded-sm bg-[#071a3d] px-2 py-1 text-xs font-black text-white">
                신뢰도 {data.result.confidence}
              </span>
              <span
                className={[
                  "rounded-sm px-2 py-1 text-xs font-black",
                  data.result.lineupApplied
                    ? "bg-[#ecfdf3] text-[#027a48]"
                    : "bg-[#eef2f7] text-[#667085]",
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
            <div className="rounded-sm border border-[#d8deea] bg-white p-3">
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

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-sm border border-[#d8deea] bg-white p-3">
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
              <p className="mt-3 text-xs font-bold text-[#92400e]">
                {data.result.modelUsed
                  ? "OpenAI로 설명 문장을 생성했습니다."
                  : "OpenAI 키가 없어 계산 기반 문장을 사용했습니다."}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

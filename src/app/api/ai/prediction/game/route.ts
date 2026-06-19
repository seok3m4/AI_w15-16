import { NextResponse } from "next/server";

import { createGamePrediction } from "@/lib/ai/game-prediction";
import type { KboGame } from "@/lib/kbo/game";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKboGame(value: unknown): value is KboGame {
  return (
    isRecord(value) &&
    typeof value.gameDate === "string" &&
    typeof value.awayTeam === "string" &&
    typeof value.homeTeam === "string" &&
    typeof value.status === "string"
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isRecord(body) || !isKboGame(body.game)) {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "경기 정보를 확인해주세요.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createGamePrediction({
      game: body.game,
    });

    return NextResponse.json({
      status: "ready",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "경기 전망을 정리하지 못했습니다.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";

import { fetchKboBoxscore } from "@/lib/kbo/boxscore";

export const runtime = "nodejs";

function getStringParam(value: string | null): string {
  return value?.trim() ?? "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = getStringParam(searchParams.get("gameId"));
  const gameDate = getStringParam(searchParams.get("gameDate"));
  const awayTeam = getStringParam(searchParams.get("awayTeam"));
  const homeTeam = getStringParam(searchParams.get("homeTeam"));

  if (!gameId || !gameDate || !awayTeam || !homeTeam) {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "박스스코어 조회에 필요한 경기 정보가 부족합니다.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await fetchKboBoxscore({
      gameId,
      gameDate,
      awayTeam,
      homeTeam,
    });

    return NextResponse.json({
      status: "ready",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KBO boxscore lookup failed.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

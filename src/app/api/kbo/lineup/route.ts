import { NextResponse } from "next/server";

import { fetchKboLineup } from "@/lib/kbo/lineup";

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
        message: "라인업 조회에 필요한 경기 정보가 부족합니다.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await fetchKboLineup({
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
      error instanceof Error ? error.message : "KBO lineup lookup failed.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

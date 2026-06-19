import { NextResponse } from "next/server";

import { runReviewAgent } from "@/lib/ai/review-agent";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 내용을 확인해주세요." },
      { status: 400 },
    );
  }

  if (!isRecord(body) || typeof body.memo !== "string") {
    return NextResponse.json(
      { message: "경기 메모를 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const result = await runReviewAgent({
      memo: body.memo,
      favoriteTeam:
        typeof body.favoriteTeam === "string" ? body.favoriteTeam : undefined,
      gameDate:
        typeof body.gameDate === "string" ? body.gameDate : undefined,
    });

    return NextResponse.json({
      status: "ready",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "리뷰 초안을 만들지 못했습니다.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 400 },
    );
  }
}

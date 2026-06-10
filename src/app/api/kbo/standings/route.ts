import { NextResponse } from "next/server";

import { fetchKboStandings } from "@/lib/kbo/standings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const result = await fetchKboStandings({
      forceRefresh: searchParams.get("refresh") === "true",
    });

    return NextResponse.json({
      status: "ready",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KBO standings lookup failed.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

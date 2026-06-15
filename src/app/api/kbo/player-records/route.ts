import { NextResponse } from "next/server";

import { fetchPlayerRecords } from "@/lib/kbo/player-records";

export const runtime = "nodejs";

function getNumberParam(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const number = Number(value);

  return Number.isInteger(number) ? number : undefined;
}

function getStringParam(value: string | null): string | undefined {
  return value?.trim() || undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const result = await fetchPlayerRecords({
      season: getStringParam(searchParams.get("season")),
      type: getStringParam(searchParams.get("type")),
      sortField: getStringParam(searchParams.get("sortField")),
      sortDirection: getStringParam(searchParams.get("sortDirection")),
      page: getNumberParam(searchParams.get("page")),
      pageSize: getNumberParam(searchParams.get("pageSize")),
      forceRefresh: searchParams.get("refresh") === "true",
    });

    return NextResponse.json({
      status: "ready",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KBO player records lookup failed.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

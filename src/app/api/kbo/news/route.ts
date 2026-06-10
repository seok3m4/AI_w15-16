import { NextResponse } from "next/server";

import { fetchKboNews } from "@/lib/kbo/news";

export const runtime = "nodejs";

function getLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const limit = Number(value);

  return Number.isInteger(limit) ? limit : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const result = await fetchKboNews({
      limit: getLimit(searchParams.get("limit")),
      forceRefresh: searchParams.get("refresh") === "true",
    });

    return NextResponse.json({
      status: "ready",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KBO news lookup failed.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

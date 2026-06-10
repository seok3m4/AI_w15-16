import { NextResponse } from "next/server";

import type {
  KboGamesResult,
  McpToolResult,
} from "@/lib/mcp/baseball-briefing-tools";
import { invokeBaseballMcpTool } from "@/lib/mcp/json-rpc";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getMcpResult(value: unknown): McpToolResult<KboGamesResult> {
  if (!isRecord(value) || !("structuredContent" in value)) {
    throw new Error("MCP response is invalid.");
  }

  return value as McpToolResult<KboGamesResult>;
}

async function createKboGamesResponse(input: {
  date?: string;
  team?: string;
}) {
  const toolResult = await invokeBaseballMcpTool("get_kbo_games", {
    date: input.date,
    team: input.team,
  });
  const result = getMcpResult(toolResult).structuredContent;

  return NextResponse.json({
    status: "ready",
    result,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    return await createKboGamesResponse({
      date: getStringParam(searchParams.get("date")),
      team: getStringParam(searchParams.get("team")),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KBO game lookup failed.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    return await createKboGamesResponse({
      date: isRecord(body) ? getStringParam(body.date) : undefined,
      team: isRecord(body) ? getStringParam(body.team) : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KBO game lookup failed.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";

import type {
  KboGameRecordBriefingResult,
  McpToolResult,
} from "@/lib/mcp/baseball-briefing-tools";
import { invokeBaseballMcpTool } from "@/lib/mcp/json-rpc";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getMcpResult(
  value: unknown,
): McpToolResult<KboGameRecordBriefingResult> {
  if (!isRecord(value) || !("structuredContent" in value)) {
    throw new Error("MCP response is invalid.");
  }

  return value as McpToolResult<KboGameRecordBriefingResult>;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Request body is invalid." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { message: "Request body must be an object." },
      { status: 400 },
    );
  }

  try {
    const toolResult = await invokeBaseballMcpTool(
      "brief_kbo_game_record",
      body,
    );
    const result = getMcpResult(toolResult).structuredContent;

    return NextResponse.json({
      status: "ready",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "KBO official record briefing failed.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

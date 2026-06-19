import { NextResponse } from "next/server";

import {
  createMcpBriefing,
  type BriefingMode,
} from "@/lib/ai/mcp-briefing";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 400;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseInput(body: unknown):
  | {
      ok: true;
      mode: BriefingMode;
      input: string;
    }
  | {
      ok: false;
      message: string;
    } {
  if (!isRecord(body)) {
    return { ok: false, message: "요청 내용을 확인해주세요." };
  }

  const mode = body.mode;
  const input = typeof body.input === "string" ? body.input.trim() : "";

  if (mode !== "keyword" && mode !== "url") {
    return { ok: false, message: "정리 방식을 확인해주세요." };
  }

  if (input.length < 2 || input.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      message: `입력 내용은 2자 이상 ${MAX_INPUT_LENGTH}자 이하로 작성해주세요.`,
    };
  }

  return {
    ok: true,
    mode,
    input,
  };
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

  const parsed = parseInput(body);

  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  try {
    const briefing = await createMcpBriefing(parsed.mode, parsed.input);

    return NextResponse.json({
      status: "ready",
      briefing,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "뉴스를 정리하지 못했습니다.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

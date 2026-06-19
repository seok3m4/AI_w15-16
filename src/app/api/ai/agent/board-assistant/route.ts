import { NextResponse } from "next/server";

import {
  type BoardAssistantMessage,
  runBoardAssistantAgent,
} from "@/lib/ai/board-assistant-agent";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getMessages(value: unknown): BoardAssistantMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (message): message is BoardAssistantMessage =>
        isRecord(message) &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .slice(-6);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "요청 내용을 확인해주세요.",
      },
      { status: 400 },
    );
  }

  if (!isRecord(body) || typeof body.question !== "string") {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "질문을 입력해주세요.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await runBoardAssistantAgent({
      question: body.question,
      selectedTeam:
        typeof body.selectedTeam === "string" ? body.selectedTeam : undefined,
      messages: getMessages(body.messages),
    });

    return NextResponse.json({
      status: "ready",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "답변을 만들지 못했습니다.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 400 },
    );
  }
}

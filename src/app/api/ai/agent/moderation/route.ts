import { NextResponse } from "next/server";

import {
  type ModerationTargetType,
  runModerationAgent,
} from "@/lib/ai/moderation-agent";
import { stripPostImageMarkdown } from "@/lib/posts/content";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getTargetType(value: unknown): ModerationTargetType | null {
  return value === "post" || value === "comment" ? value : null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "Request body is invalid.",
      },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "Request body is invalid.",
      },
      { status: 400 },
    );
  }

  const targetType = getTargetType(body.targetType);
  const content = getString(body.content);

  if (!targetType || !content) {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "targetType and content are required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await runModerationAgent({
      targetType,
      title: getString(body.title),
      content: stripPostImageMarkdown(content),
    });

    return NextResponse.json({
      status: "ready",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Moderation agent failed.";

    return NextResponse.json(
      {
        status: "unavailable",
        message,
      },
      { status: 502 },
    );
  }
}

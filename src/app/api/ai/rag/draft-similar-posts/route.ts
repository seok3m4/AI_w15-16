import { NextResponse } from "next/server";

import { DEFAULT_RAG_LIMIT, MAX_RAG_LIMIT } from "@/lib/ai/config";
import { findSimilarPostsForDraft } from "@/lib/ai/rag";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getLimit(value: unknown): number {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return DEFAULT_RAG_LIMIT;
  }

  return Math.min(limit, MAX_RAG_LIMIT);
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

  const result = await findSimilarPostsForDraft({
    title: getString(body.title),
    content: getString(body.content),
    tags: getTags(body.tags),
    limit: getLimit(body.limit),
  });

  if (!result.ok) {
    return NextResponse.json({
      status: result.status,
      message: result.message,
      similarPosts: [],
      summary: null,
      duplicateRisk: "none",
      duplicateWarning: null,
      topSimilarity: null,
    });
  }

  return NextResponse.json({
    status: "ready",
    similarPosts: result.similarPosts,
    summary: result.summary,
    duplicateRisk: result.duplicateRisk,
    duplicateWarning: result.duplicateWarning,
    topSimilarity: result.topSimilarity,
  });
}

import { NextResponse } from "next/server";

import { DEFAULT_RAG_LIMIT, MAX_RAG_LIMIT } from "@/lib/ai/config";
import { findSimilarPostsForPost } from "@/lib/ai/rag";

export const runtime = "nodejs";

function parseLimit(value: string | null): number {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return DEFAULT_RAG_LIMIT;
  }

  return Math.min(limit, MAX_RAG_LIMIT);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId")?.trim();

  if (!postId) {
    return NextResponse.json(
      { message: "postId query parameter is required." },
      { status: 400 },
    );
  }

  const result = await findSimilarPostsForPost(
    postId,
    parseLimit(searchParams.get("limit")),
  );

  if (!result.ok) {
    const status = result.status === "not_found" ? 404 : 200;

    return NextResponse.json(
      {
        status: result.status,
        message: result.message,
        similarPosts: [],
        summary: null,
      },
      { status },
    );
  }

  return NextResponse.json({
    status: "ready",
    sourcePostId: result.sourcePostId,
    similarPosts: result.similarPosts,
    summary: result.summary,
  });
}

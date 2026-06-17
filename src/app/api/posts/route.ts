import { NextResponse } from "next/server";

import {
  getModerationBlockMessage,
  runModerationAgent,
} from "@/lib/ai/moderation-agent";
import { getCurrentUser } from "@/lib/auth/session";
import { refreshPostEmbedding } from "@/lib/ai/rag";
import { toPaginationResponse } from "@/lib/pagination";
import { stripPostImageMarkdown } from "@/lib/posts/content";
import { parsePostListQuery } from "@/lib/posts/query";
import { postSelect, toPostResponse } from "@/lib/posts/serializer";
import { validateCreatePostInput } from "@/lib/posts/validation";
import { prisma } from "@/lib/prisma";
import { replacePostTags } from "@/lib/tags/mutations";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currentUser = await getCurrentUser();
  const parsedQuery = parsePostListQuery(searchParams);

  if (!parsedQuery.ok) {
    return NextResponse.json(
      { message: parsedQuery.message },
      { status: 400 },
    );
  }

  const { pagination, searchQuery, sort, tagNames, where } = parsedQuery.data;
  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      orderBy:
        sort === "views"
          ? [{ viewCount: "desc" }, { createdAt: "desc" }]
          : { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      select: postSelect,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json(
    {
      posts: posts.map((post) => toPostResponse(post, currentUser?.id)),
      pagination: toPaginationResponse(pagination, total),
      filters: {
        q: searchQuery,
        sort,
        tag: tagNames[0] ?? "",
        tags: tagNames,
      },
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Request body is invalid." },
      { status: 400 },
    );
  }

  const validation = validateCreatePostInput(body);

  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.message },
      { status: 400 },
    );
  }

  const moderation = await runModerationAgent({
    targetType: "post",
    title: validation.data.title,
    content: stripPostImageMarkdown(validation.data.content),
  });

  if (moderation.verdict === "block") {
    return NextResponse.json(
      {
        message: getModerationBlockMessage(moderation),
        moderation,
      },
      { status: 422 },
    );
  }

  const post = await prisma.$transaction(async (tx) => {
    const createdPost = await tx.post.create({
      data: {
        title: validation.data.title,
        content: validation.data.content,
        authorId: currentUser.id,
      },
      select: { id: true },
    });

    await replacePostTags(tx, createdPost.id, validation.data.tags);

    return tx.post.findUniqueOrThrow({
      where: { id: createdPost.id },
      select: postSelect,
    });
  });

  await refreshPostEmbedding(post.id);

  return NextResponse.json(
    { post: toPostResponse(post) },
    { status: 201, headers: NO_STORE_HEADERS },
  );
}

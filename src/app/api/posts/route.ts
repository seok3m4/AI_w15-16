import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { parsePagination } from "@/lib/pagination";
import { postSelect, toPostResponse } from "@/lib/posts/serializer";
import { validateCreatePostInput } from "@/lib/posts/validation";
import { prisma } from "@/lib/prisma";
import { replacePostTags } from "@/lib/tags/mutations";
import { normalizeTagName } from "@/lib/tags/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const rawTag = searchParams.get("tag");
  const tagName = rawTag ? normalizeTagName(rawTag) : "";
  const where = tagName
    ? {
        tags: {
          some: {
            tag: {
              name: tagName,
            },
          },
        },
      }
    : {};
  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      select: postSelect,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts: posts.map(toPostResponse),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  });
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

  return NextResponse.json({ post: toPostResponse(post) }, { status: 201 });
}

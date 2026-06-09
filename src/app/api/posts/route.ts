import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { parsePagination } from "@/lib/pagination";
import { postSelect, toPostResponse } from "@/lib/posts/serializer";
import { validateCreatePostInput } from "@/lib/posts/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      select: postSelect,
    }),
    prisma.post.count(),
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

  const post = await prisma.post.create({
    data: {
      title: validation.data.title,
      content: validation.data.content,
      authorId: currentUser.id,
    },
    select: postSelect,
  });

  return NextResponse.json({ post: toPostResponse(post) }, { status: 201 });
}

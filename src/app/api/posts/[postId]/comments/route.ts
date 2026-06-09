import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { commentSelect, toCommentResponse } from "@/lib/comments/serializer";
import { validateCommentInput } from "@/lib/comments/validation";
import { parsePagination, toPaginationResponse } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

async function postExists(postId: string): Promise<boolean> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  return Boolean(post);
}

export async function GET(request: Request, context: RouteContext) {
  const { postId } = await context.params;

  if (!(await postExists(postId))) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      skip: pagination.skip,
      take: pagination.take,
      select: commentSelect,
    }),
    prisma.comment.count({
      where: { postId },
    }),
  ]);

  return NextResponse.json({
    comments: comments.map(toCommentResponse),
    pagination: toPaginationResponse(pagination, total),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const { postId } = await context.params;

  if (!(await postExists(postId))) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
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

  const validation = validateCommentInput(body);

  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.message },
      { status: 400 },
    );
  }

  const comment = await prisma.comment.create({
    data: {
      content: validation.data.content,
      postId,
      authorId: currentUser.id,
    },
    select: commentSelect,
  });

  return NextResponse.json(
    { comment: toCommentResponse(comment) },
    { status: 201 },
  );
}

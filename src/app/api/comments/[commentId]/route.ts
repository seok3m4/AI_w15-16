import { NextResponse } from "next/server";

import {
  getModerationBlockMessage,
  runModerationAgent,
} from "@/lib/ai/moderation-agent";
import { getCurrentUser } from "@/lib/auth/session";
import { commentSelect, toCommentResponse } from "@/lib/comments/serializer";
import { validateCommentInput } from "@/lib/comments/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    commentId: string;
  }>;
};

async function findCommentOwner(commentId: string): Promise<string | null> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  return comment?.authorId ?? null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const { commentId } = await context.params;
  const ownerId = await findCommentOwner(commentId);

  if (!ownerId) {
    return NextResponse.json(
      { message: "Comment not found." },
      { status: 404 },
    );
  }

  if (ownerId !== currentUser.id) {
    return NextResponse.json(
      { message: "You can only update your own comments." },
      { status: 403 },
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

  const validation = validateCommentInput(body);

  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.message },
      { status: 400 },
    );
  }

  const moderation = await runModerationAgent({
    targetType: "comment",
    content: validation.data.content,
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

  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content: validation.data.content,
    },
    select: commentSelect,
  });

  return NextResponse.json({ comment: toCommentResponse(comment) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const { commentId } = await context.params;
  const ownerId = await findCommentOwner(commentId);

  if (!ownerId) {
    return NextResponse.json(
      { message: "Comment not found." },
      { status: 404 },
    );
  }

  if (ownerId !== currentUser.id) {
    return NextResponse.json(
      { message: "You can only delete your own comments." },
      { status: 403 },
    );
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return NextResponse.json({ message: "Comment deleted." });
}

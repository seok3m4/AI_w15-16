import { NextResponse } from "next/server";

import {
  getModerationBlockMessage,
  runModerationAgent,
} from "@/lib/ai/moderation-agent";
import { refreshPostEmbedding } from "@/lib/ai/rag";
import { getCurrentUser } from "@/lib/auth/session";
import { stripPostImageMarkdown } from "@/lib/posts/content";
import { postSelect, toPostResponse } from "@/lib/posts/serializer";
import { validateUpdatePostInput } from "@/lib/posts/validation";
import { prisma } from "@/lib/prisma";
import { replacePostTags } from "@/lib/tags/mutations";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

async function findPostOwner(postId: string): Promise<string | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  return post?.authorId ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { postId } = await context.params;
  const currentUser = await getCurrentUser();
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: postSelect,
  });

  if (!post) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  return NextResponse.json(
    { post: toPostResponse(post, currentUser?.id) },
    { headers: NO_STORE_HEADERS },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const { postId } = await context.params;
  const ownerId = await findPostOwner(postId);

  if (!ownerId) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  if (ownerId !== currentUser.id) {
    return NextResponse.json(
      { message: "You can only update your own posts." },
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

  const validation = validateUpdatePostInput(body);

  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.message },
      { status: 400 },
    );
  }

  if (validation.data.title || validation.data.content) {
    const moderation = await runModerationAgent({
      targetType: "post",
      title: validation.data.title,
      content: stripPostImageMarkdown(validation.data.content ?? ""),
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
  }

  const post = await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        title: validation.data.title,
        content: validation.data.content,
      },
      select: { id: true },
    });

    if (validation.data.tags !== undefined) {
      await replacePostTags(tx, postId, validation.data.tags);
    }

    return tx.post.findUniqueOrThrow({
      where: { id: postId },
      select: postSelect,
    });
  });

  await refreshPostEmbedding(post.id);

  return NextResponse.json(
    { post: toPostResponse(post) },
    { headers: NO_STORE_HEADERS },
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const { postId } = await context.params;
  const ownerId = await findPostOwner(postId);

  if (!ownerId) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  if (ownerId !== currentUser.id) {
    return NextResponse.json(
      { message: "You can only delete your own posts." },
      { status: 403 },
    );
  }

  await prisma.post.delete({
    where: { id: postId },
  });

  return NextResponse.json(
    { message: "Post deleted." },
    { headers: NO_STORE_HEADERS },
  );
}

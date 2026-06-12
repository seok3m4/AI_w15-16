import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

type VoteType = "UP" | "DOWN";

function parseVoteType(value: unknown): VoteType | null | undefined {
  if (value === null) {
    return null;
  }

  if (value === "UP" || value === "DOWN") {
    return value;
  }

  return undefined;
}

async function getVoteSummary(postId: string, userId?: string | null) {
  const [upVotes, downVotes] = await prisma.$transaction([
    prisma.postVote.count({
      where: {
        postId,
        type: "UP",
      },
    }),
    prisma.postVote.count({
      where: {
        postId,
        type: "DOWN",
      },
    }),
  ]);
  const viewerVote = userId
    ? await prisma.postVote.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
        select: {
          type: true,
        },
      })
    : null;

  return {
    upVotes,
    downVotes,
    voteScore: upVotes - downVotes,
    viewerVote: viewerVote?.type ?? null,
  };
}

async function postExists(postId: string): Promise<boolean> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  return Boolean(post);
}

export async function GET(_request: Request, context: RouteContext) {
  const { postId } = await context.params;
  const currentUser = await getCurrentUser();

  if (!(await postExists(postId))) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      vote: await getVoteSummary(postId, currentUser?.id),
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function PUT(request: Request, context: RouteContext) {
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

  const type = parseVoteType(
    typeof body === "object" && body !== null && "type" in body
      ? body.type
      : undefined,
  );

  if (type === undefined) {
    return NextResponse.json(
      { message: "Vote type must be UP, DOWN, or null." },
      { status: 400 },
    );
  }

  if (type === null) {
    await prisma.postVote.deleteMany({
      where: {
        postId,
        userId: currentUser.id,
      },
    });
  } else {
    await prisma.postVote.upsert({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
      create: {
        postId,
        userId: currentUser.id,
        type,
      },
      update: {
        type,
      },
    });
  }

  return NextResponse.json(
    {
      vote: await getVoteSummary(postId, currentUser.id),
    },
    { headers: NO_STORE_HEADERS },
  );
}

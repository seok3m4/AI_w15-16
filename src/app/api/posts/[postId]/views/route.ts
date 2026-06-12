import { NextResponse } from "next/server";

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

export async function POST(_request: Request, context: RouteContext) {
  const { postId } = await context.params;

  try {
    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: {
        viewCount: true,
      },
    });

    return NextResponse.json(
      {
        views: post.viewCount,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { publicUserSelect, toPublicUser } from "@/lib/auth/user";
import { KBO_TEAMS } from "@/lib/kbo/game";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeFavoriteTeam(value: unknown): string | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const teamName = value.trim();

  if (!teamName) {
    return null;
  }

  return (
    KBO_TEAMS.find(
      (candidate) => candidate.toLowerCase() === teamName.toLowerCase(),
    ) ?? undefined
  );
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      {
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: "요청 내용을 확인해주세요.",
      },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      {
        message: "요청 내용을 확인해주세요.",
      },
      { status: 400 },
    );
  }

  const favoriteTeam = normalizeFavoriteTeam(body.favoriteTeam);

  if (favoriteTeam === undefined) {
    return NextResponse.json(
      {
        message: "응원팀은 KBO 10개 구단 중에서 선택해주세요.",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: {
      id: currentUser.id,
    },
    data: {
      favoriteTeam,
    },
    select: publicUserSelect,
  });

  return NextResponse.json({
    user: toPublicUser(user),
  });
}

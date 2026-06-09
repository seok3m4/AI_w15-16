import { NextResponse } from "next/server";

import { setAuthCookie } from "@/lib/auth/cookie";
import { verifyPassword } from "@/lib/auth/password";
import { createAuthToken } from "@/lib/auth/token";
import { toPublicUser } from "@/lib/auth/user";
import { validateLoginInput } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const validation = validateLoginInput(body);

  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.message },
      { status: 400 },
    );
  }

  const { email, password } = validation.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      nickname: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { message: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const token = createAuthToken(user);
  const response = NextResponse.json({ user: toPublicUser(user) });

  setAuthCookie(response, token);

  return response;
}

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { setAuthCookie } from "@/lib/auth/cookie";
import { hashPassword } from "@/lib/auth/password";
import { createAuthToken } from "@/lib/auth/token";
import { publicUserSelect, toPublicUser } from "@/lib/auth/user";
import { validateSignupInput } from "@/lib/auth/validation";
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

  const validation = validateSignupInput(body);

  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.message },
      { status: 400 },
    );
  }

  const { email, password, nickname } = validation.data;

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname,
      },
      select: publicUserSelect,
    });
    const token = createAuthToken(user);
    const response = NextResponse.json(
      { user: toPublicUser(user) },
      { status: 201 },
    );

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "이미 가입된 이메일입니다." },
        { status: 409 },
      );
    }

    console.error(error);

    return NextResponse.json(
      { message: "회원가입 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

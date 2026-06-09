import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth/cookie";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ message: "로그아웃되었습니다." });

  clearAuthCookie(response);

  return response;
}

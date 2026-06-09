import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  return NextResponse.json({ user });
}

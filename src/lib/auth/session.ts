import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifyAuthToken } from "@/lib/auth/token";
import { publicUserSelect, type PublicUser, toPublicUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: publicUserSelect,
  });

  return user ? toPublicUser(user) : null;
}

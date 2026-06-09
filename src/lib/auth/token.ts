import { createHmac, timingSafeEqual } from "node:crypto";

import { AUTH_TOKEN_EXPIRES_IN_SECONDS } from "@/lib/auth/constants";

type AuthTokenUser = {
  id: string;
  email: string;
  nickname: string;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  nickname: string;
  iat: number;
  exp: number;
};

const JWT_HEADER = {
  alg: "HS256",
  typ: "JWT",
};

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }

  return secret;
}

function toBase64Url(value: string | Buffer): string {
  if (Buffer.isBuffer(value)) {
    return value.toString("base64url");
  }

  return Buffer.from(value).toString("base64url");
}

function sign(input: string): string {
  return createHmac("sha256", getAuthSecret()).update(input).digest("base64url");
}

export function createAuthToken(user: AuthTokenUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    nickname: user.nickname,
    iat: now,
    exp: now + AUTH_TOKEN_EXPIRES_IN_SECONDS,
  };
  const headerPart = toBase64Url(JSON.stringify(JWT_HEADER));
  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signaturePart = sign(`${headerPart}.${payloadPart}`);

  return `${headerPart}.${payloadPart}.${signaturePart}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [headerPart, payloadPart, signaturePart] = token.split(".");

  if (!headerPart || !payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = sign(`${headerPart}.${payloadPart}`);
  const actualSignatureBuffer = Buffer.from(signaturePart);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    actualSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(actualSignatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as Partial<AuthTokenPayload>;
    const now = Math.floor(Date.now() / 1000);

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.nickname !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp <= now
    ) {
      return null;
    }

    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

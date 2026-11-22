import { createHmac, timingSafeEqual } from "node:crypto";

// جلسة موقّعة بـ HMAC: لا تحتوي إلا على معرّف المستخدم والمدرسة والدور وتاريخ الانتهاء.
// لا تُخزَّن فيها أي بيانات شخصية أخرى.
export type SessionPayload = {
  userId: string;
  schoolId: string;
  role: string;
  exp: number; // unix seconds
};

const SESSION_TTL_SECONDS = 60 * 60 * 8; // ثماني ساعات

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long");
  }
  return secret;
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  now: number = Math.floor(Date.now() / 1000),
): string {
  const full: SessionPayload = { ...payload, exp: now + SESSION_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${sign(body, getSecret())}`;
}

export function readSessionToken(
  token: string,
  now: number = Math.floor(Date.now() / 1000),
): SessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = Buffer.from(sign(body, getSecret()));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  let parsed: SessionPayload;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
  if (!parsed.userId || !parsed.schoolId || !parsed.role) return null;
  return parsed;
}

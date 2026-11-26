import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { verifyPassword } from "../../../src/lib/password";
import { createSessionToken } from "../../../src/lib/session";

export const runtime = "nodejs";

const SESSION_COOKIE = "amroo_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

// رسالة خطأ واحدة لكل الحالات، حتى لا يُعرف من خلالها هل البريد مسجّل أم لا.
const GENERIC_ERROR = "البريد الإلكتروني أو كلمة المرور غير صحيحة";

export async function POST(request: Request) {
  let body: { email?: unknown; identifier?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  // الدخول بالبريد الإلكتروني أو برقم الهوية المسجّل للحساب.
  const raw = typeof body.identifier === "string" ? body.identifier : typeof body.email === "string" ? body.email : "";
  const identifier = raw.trim().toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!identifier || !password || password.length > 200) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { nationalId: identifier }] },
  });
  const ok = user && user.isActive && (await verifyPassword(password, user.passwordHash));
  if (!user || !ok) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      actorId: user.id,
      action: "login",
      entity: "User",
      entityId: user.id,
    },
  });

  const token = createSessionToken({
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

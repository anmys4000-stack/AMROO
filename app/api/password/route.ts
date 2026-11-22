import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { hashPassword, verifyPassword } from "../../../src/lib/password";
import { readSessionToken } from "../../../src/lib/session";

export const runtime = "nodejs";

// تغيير كلمة المرور للمستخدم المسجّل دخوله، ويتطلب كلمة المرور الحالية.
export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get("amroo_session")?.value;
  const session = token ? readSessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا" }, { status: 401 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  if (next.length < 12 || next.length > 200) {
    return NextResponse.json({ error: "كلمة المرور الجديدة يجب أن تكون 12 حرفًا على الأقل" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive || !(await verifyPassword(current, user.passwordHash))) {
    return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "password_changed", entity: "User", entityId: user.id },
  });

  return NextResponse.json({ ok: true });
}

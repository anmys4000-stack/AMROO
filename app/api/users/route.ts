import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";
import { hashPassword } from "../../../src/lib/password";

export const runtime = "nodejs";

const ROLES = ["PRINCIPAL", "STUDENT_AFFAIRS", "GUIDANCE", "ACADEMIC_DEPUTY", "TEACHER"] as const;

// إنشاء حساب مستخدم جديد داخل مدرسة المدير، بكلمة مرور مؤقتة تُعرض مرة واحدة.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { fullName?: unknown; email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = (ROLES as readonly string[]).includes(body.role as string) ? (body.role as (typeof ROLES)[number]) : null;
  if (fullName.length < 3 || fullName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120 || !role) {
    return NextResponse.json({ error: "بيانات المستخدم غير صالحة" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "البريد مستخدم بالفعل" }, { status: 409 });

  const temporaryPassword = randomBytes(12).toString("base64url");
  const created = await prisma.user.create({
    data: {
      schoolId: user.schoolId,
      email,
      fullName,
      role,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    },
    select: { id: true },
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "user_created", entity: "User", entityId: created.id },
  });
  return NextResponse.json({ id: created.id, temporaryPassword }, { status: 201 });
}

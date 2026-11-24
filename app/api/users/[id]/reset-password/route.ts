import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../../src/lib/auth";
import { hashPassword } from "../../../../../src/lib/password";

export const runtime = "nodejs";

// المدير يعيد تعيين كلمة مرور معلم في مدرسته، فتُنشأ كلمة مؤقتة تُعرض مرة واحدة ويُجبر المعلم على تغييرها.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.schoolId !== user.schoolId || target.role !== "TEACHER") {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  const temporaryPassword = randomBytes(12).toString("base64url");
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true },
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "password_reset", entity: "User", entityId: target.id },
  });

  return NextResponse.json({ temporaryPassword });
}

import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../src/lib/auth";

export const runtime = "nodejs";

// المدير يعدّل اسم المعلم وتخصصه داخل مدرسته فقط، ويُسجَّل التعديل في سجل التدقيق.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { fullName?: unknown; specialty?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const specialty = typeof body.specialty === "string" ? body.specialty.trim().slice(0, 60) : "";
  if (fullName.length < 3 || fullName.length > 120) {
    return NextResponse.json({ error: "الاسم غير صالح" }, { status: 400 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.schoolId !== user.schoolId || target.role !== "TEACHER") {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { fullName, specialty: specialty || null },
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "user_updated", entity: "User", entityId: target.id },
  });

  return NextResponse.json({ ok: true });
}

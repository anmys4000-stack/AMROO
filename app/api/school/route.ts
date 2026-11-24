import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// تعديل اسم المدرسة. متاح للمدير فقط.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 3 || name.length > 160) {
    return NextResponse.json({ error: "اسم المدرسة غير صالح" }, { status: 400 });
  }

  await prisma.school.update({ where: { id: user.schoolId }, data: { name } });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "school_updated", entity: "School", entityId: user.schoolId },
  });
  return NextResponse.json({ ok: true });
}

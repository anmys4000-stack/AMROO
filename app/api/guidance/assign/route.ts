import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../src/lib/auth";

export const runtime = "nodejs";

// توزيع الموجهين الطلابيين على الصفوف. المدير فقط. الموجه يجب أن يكون من المدرسة نفسها ولديه دور الموجه.
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });

  let body: { assignments?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (!body.assignments || typeof body.assignments !== "object") {
    return NextResponse.json({ error: "بيانات التوزيع غير صالحة" }, { status: 400 });
  }
  const entries = Object.entries(body.assignments as Record<string, unknown>);

  const counselors = await prisma.user.findMany({
    where: { schoolId: user.schoolId, isActive: true, OR: [{ role: "GUIDANCE" }, { extraRoles: { has: "GUIDANCE" } }] },
    select: { id: true },
  });
  const allowed = new Set(counselors.map((c) => c.id));
  const classes = await prisma.schoolClass.findMany({ where: { schoolId: user.schoolId }, select: { id: true } });
  const classIds = new Set(classes.map((c) => c.id));

  for (const [classId, counselorId] of entries) {
    if (!classIds.has(classId)) return NextResponse.json({ error: "صف غير موجود" }, { status: 404 });
    if (counselorId !== "" && (typeof counselorId !== "string" || !allowed.has(counselorId))) {
      return NextResponse.json({ error: "الموجه غير صالح لهذه المدرسة" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    entries.map(([classId, counselorId]) =>
      prisma.schoolClass.update({ where: { id: classId }, data: { counselorId: counselorId === "" ? null : (counselorId as string) } }),
    ),
  );
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "counselors_assigned", entity: "SchoolClass", entityId: user.schoolId },
  });
  return NextResponse.json({ ok: true });
}

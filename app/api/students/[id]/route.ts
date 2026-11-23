import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../src/lib/auth";

export const runtime = "nodejs";

// حذف طالب من مدرسة المستخدم فقط، مع تسجيل العملية في سجل التدقيق.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "students:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student || student.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  await prisma.student.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "student_deleted", entity: "Student", entityId: id },
  });
  return NextResponse.json({ ok: true });
}

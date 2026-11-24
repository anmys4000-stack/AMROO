import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// تحديد رائد الفصل (معلم من مدرسة المستخدم). إن كان المعرّف فارغًا يُلغى الرائد.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { classId?: unknown; teacherId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const classId = typeof body.classId === "string" ? body.classId : "";
  const teacherId = typeof body.teacherId === "string" ? body.teacherId : "";
  if (!classId) return NextResponse.json({ error: "الفصل مطلوب" }, { status: 400 });

  const cls = await prisma.schoolClass.findUnique({ where: { id: classId } });
  if (!cls || cls.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الفصل غير موجود" }, { status: 404 });
  }
  if (teacherId) {
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.schoolId !== user.schoolId || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "المعلم غير موجود" }, { status: 400 });
    }
  }

  await prisma.schoolClass.update({ where: { id: classId }, data: { homeroomLeaderId: teacherId || null } });
  return NextResponse.json({ ok: true });
}

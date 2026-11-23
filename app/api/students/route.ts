import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// قائمة طلاب مدرسة المستخدم فقط.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "students:view")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  const where = { schoolId: user.schoolId, isActive: true };
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      select: { id: true, fullName: true, classId: true },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
    prisma.student.count({ where }),
  ]);
  return NextResponse.json({ students, total });
}

// إضافة طالب إلى مدرسة المستخدم فقط.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "students:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { fullName?: unknown; classId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (fullName.length < 3 || fullName.length > 120) {
    return NextResponse.json({ error: "اسم الطالب غير صالح" }, { status: 400 });
  }

  let classId: string | null = null;
  if (typeof body.classId === "string" && body.classId) {
    const cls = await prisma.schoolClass.findUnique({ where: { id: body.classId } });
    if (!cls || cls.schoolId !== user.schoolId) {
      return NextResponse.json({ error: "الفصل غير موجود" }, { status: 400 });
    }
    classId = cls.id;
  }

  const student = await prisma.student.create({
    data: { schoolId: user.schoolId, fullName, classId },
    select: { id: true, fullName: true, classId: true },
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "student_created", entity: "Student", entityId: student.id },
  });
  return NextResponse.json({ student }, { status: 201 });
}

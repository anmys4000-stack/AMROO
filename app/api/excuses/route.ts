import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// إنشاء عذر غياب لطالب في تاريخ محدد داخل مدرسة المستخدم.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "attendance:record")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { studentId?: unknown; date?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const date = typeof body.date === "string" ? new Date(`${body.date}T00:00:00Z`) : null;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!studentId || !date || Number.isNaN(date.getTime()) || reason.length < 3 || reason.length > 300) {
    return NextResponse.json({ error: "بيانات العذر غير صالحة" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  const excuse = await prisma.excuse.create({
    data: { schoolId: user.schoolId, studentId, date, reason, createdBy: user.id },
    select: { id: true },
  });
  return NextResponse.json({ excuse }, { status: 201 });
}

// اعتماد عذر أو رفضه. عند الاعتماد يُسجَّل الطالب "بعذر" في ذلك اليوم.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { id?: unknown; decision?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const decision = body.decision === "APPROVED" || body.decision === "REJECTED" ? body.decision : null;
  if (!id || !decision) return NextResponse.json({ error: "القرار غير صالح" }, { status: 400 });

  const excuse = await prisma.excuse.findUnique({ where: { id } });
  if (!excuse || excuse.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "العذر غير موجود" }, { status: 404 });
  }

  await prisma.excuse.update({ where: { id }, data: { status: decision } });
  if (decision === "APPROVED") {
    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: excuse.studentId, date: excuse.date } },
      create: { schoolId: excuse.schoolId, studentId: excuse.studentId, date: excuse.date, status: "EXCUSED", recordedBy: user.id },
      update: { status: "EXCUSED", recordedBy: user.id },
    });
  }
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: `excuse_${decision.toLowerCase()}`, entity: "Excuse", entityId: id },
  });
  return NextResponse.json({ ok: true });
}

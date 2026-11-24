import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// إحالة طالب: يرفعها المعلم أو الإدارة، ويعالجها الوكيل أو الموجه.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "behavior:record")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { studentId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!studentId || reason.length < 3 || reason.length > 500) {
    return NextResponse.json({ error: "بيانات الإحالة غير صالحة" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  const referral = await prisma.referral.create({
    data: { schoolId: user.schoolId, studentId, reason, createdBy: user.id },
    select: { id: true },
  });
  return NextResponse.json({ referral }, { status: 201 });
}

// معالجة الإحالة: تُغلق بعد توثيق الإجراء المتخذ.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "referrals:handle")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!id || action.length < 3 || action.length > 500) {
    return NextResponse.json({ error: "الإجراء المتخذ مطلوب" }, { status: 400 });
  }

  const referral = await prisma.referral.findUnique({ where: { id } });
  if (!referral || referral.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الإحالة غير موجودة" }, { status: 404 });
  }

  await prisma.referral.update({ where: { id }, data: { action, status: "CLOSED", closedAt: new Date() } });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "referral_closed", entity: "Referral", entityId: id },
  });
  return NextResponse.json({ ok: true });
}

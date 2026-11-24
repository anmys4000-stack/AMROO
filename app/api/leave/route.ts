import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// المعلم يقدّم طلب استئذان لنفسه.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  let body: { date?: unknown; leaveAt?: unknown; returnAt?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const date = typeof body.date === "string" ? new Date(`${body.date}T00:00:00Z`) : null;
  const leaveAt = typeof body.leaveAt === "string" ? body.leaveAt : "";
  const returnAt = typeof body.returnAt === "string" ? body.returnAt : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!date || Number.isNaN(date.getTime()) || !TIME.test(leaveAt) || !TIME.test(returnAt) || reason.length < 3 || reason.length > 300) {
    return NextResponse.json({ error: "بيانات الاستئذان غير صالحة" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.create({
    data: { schoolId: user.schoolId, teacherId: user.id, date, leaveAt, returnAt, reason },
    select: { id: true },
  });
  return NextResponse.json({ leave }, { status: 201 });
}

// المدير أو الوكيل يعتمد الطلب أو يرفضه، ويُسجَّل تأمين الحصص عند الاعتماد.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { id?: unknown; decision?: unknown; coverage?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const decision = body.decision === "APPROVED" || body.decision === "REJECTED" ? body.decision : null;
  const coverage = typeof body.coverage === "string" ? body.coverage.trim().slice(0, 300) : null;
  if (!id || !decision) return NextResponse.json({ error: "القرار غير صالح" }, { status: 400 });

  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave || leave.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  await prisma.leaveRequest.update({
    where: { id },
    data: { status: decision, coverage: decision === "APPROVED" ? coverage || null : null },
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: `leave_${decision.toLowerCase()}`, entity: "LeaveRequest", entityId: id },
  });
  return NextResponse.json({ ok: true });
}

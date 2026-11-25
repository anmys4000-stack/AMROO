import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";
import type { Permission } from "../../../src/lib/permissions";

export const runtime = "nodejs";

// نقطة واحدة لعدة خدمات بسيطة، يحدد نوعها الحقل "service". كل خدمة لها صلاحيتها وتحقق من مدخلاتها.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const str = (v: unknown, min: number, max: number) => (typeof v === "string" && v.trim().length >= min && v.trim().length <= max ? v.trim() : null);
  const dateOf = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null);

  const service = body.service as string;
  const need = (p: Permission) => hasPermission(user, p);

  if (service === "points") {
    if (!need("behavior:record")) return forbidden();
    const studentId = typeof body.studentId === "string" ? body.studentId : "";
    const points = Number(body.points);
    const reason = str(body.reason, 3, 300);
    if (!studentId || !Number.isInteger(points) || points < 1 || points > 100 || !reason) return bad("بيانات النقاط غير صالحة");
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.schoolId !== user.schoolId) return notFound("الطالب غير موجود");
    await prisma.pointsAward.create({ data: { schoolId: user.schoolId, studentId, points, reason, createdBy: user.id } });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (service === "staff-attendance") {
    if (!need("visits:approve")) return forbidden();
    const teacherId = typeof body.teacherId === "string" ? body.teacherId : "";
    const date = dateOf(body.date);
    const kind = ["LATE", "EARLY_LEAVE", "ABSENT"].includes(body.kind as string) ? (body.kind as string) : null;
    const minutes = Number(body.minutes ?? 0);
    if (!teacherId || !date || !kind || !Number.isInteger(minutes) || minutes < 0 || minutes > 600) return bad("بيانات الحضور غير صالحة");
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.schoolId !== user.schoolId) return notFound("المعلم غير موجود");
    await prisma.staffAttendance.create({
      data: { schoolId: user.schoolId, teacherId, date, kind, minutes, note: str(body.note, 0, 300) },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (service === "duty-report") {
    if (!need("visits:approve") && !need("attendance:record")) return forbidden();
    const date = dateOf(body.date);
    const notes = str(body.notes, 3, 2000);
    if (!date || !notes) return bad("بيانات التقرير غير صالحة");
    await prisma.dutyReport.upsert({
      where: { schoolId_date: { schoolId: user.schoolId, date } },
      create: { schoolId: user.schoolId, date, notes, createdBy: user.id },
      update: { notes, createdBy: user.id },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (service === "activity-report") {
    if (!need("attendance:record")) return forbidden();
    const title = str(body.title, 3, 120);
    const text = str(body.body, 3, 4000);
    const activityId = typeof body.activityId === "string" ? body.activityId : "";
    const witnesses = typeof body.witnesses === "string" ? body.witnesses.split("\n").map((w) => w.trim()).filter(Boolean) : [];
    if (!title || !text || witnesses.length !== 2) return bad("التقرير يحتاج عنوانًا ووصفًا وشاهدين اثنين");
    if (activityId) {
      const activity = await prisma.activityPlan.findUnique({ where: { id: activityId } });
      if (!activity || activity.schoolId !== user.schoolId) return notFound("النشاط غير موجود");
    }
    await prisma.activityReport.create({
      data: {
        schoolId: user.schoolId,
        title,
        body: text,
        evidence: str(body.evidence, 0, 500),
        activityId: activityId || null,
        witnesses: witnesses.join("\n"),
        createdBy: user.id,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return bad("نوع الخدمة غير معروف");
}

function forbidden() {
  return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
}
function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
function notFound(error: string) {
  return NextResponse.json({ error }, { status: 404 });
}

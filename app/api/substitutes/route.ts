import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// حفظ توزيع حصص الانتظار ليوم محدد. يستبدل التوزيع السابق لذلك اليوم.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { date?: unknown; rows?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const date = typeof body.date === "string" ? new Date(`${body.date}T00:00:00Z`) : null;
  if (!date || Number.isNaN(date.getTime()) || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "بيانات التوزيع غير صالحة" }, { status: 400 });
  }
  const weekday = date.getUTCDay() + 1;
  if (weekday < 1 || weekday > 5) {
    return NextResponse.json({ error: "لا تُوزَّع حصص الانتظار في هذا اليوم" }, { status: 400 });
  }

  type Row = { classId: string; period: number; subject: string; absentName: string; substituteId: string };
  const rows = (body.rows as Row[]).filter(
    (r) => typeof r.classId === "string" && Number.isInteger(r.period) && r.period >= 1 && r.period <= 8 && typeof r.substituteId === "string"
  );

  // تحقق من أن المعلمين المكلَّفين من مدرسة المستخدم.
  const subIds = [...new Set(rows.map((r) => r.substituteId))];
  const valid = await prisma.user.findMany({
    where: { id: { in: subIds }, schoolId: user.schoolId, role: "TEACHER", isActive: true },
    select: { id: true },
  });
  const validIds = new Set(valid.map((v) => v.id));
  const clean = rows.filter((r) => validIds.has(r.substituteId));

  await prisma.substitution.deleteMany({ where: { schoolId: user.schoolId, date } });
  await prisma.substitution.createMany({
    data: clean.map((r) => ({
      schoolId: user.schoolId,
      date,
      weekday,
      period: r.period,
      classId: r.classId,
      subject: String(r.subject).slice(0, 60),
      absentName: String(r.absentName).slice(0, 80),
      substituteId: r.substituteId,
    })),
    skipDuplicates: true,
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "substitutes_saved", entity: "Substitution", entityId: body.date as string },
  });

  return NextResponse.json({ ok: true, saved: clean.length });
}

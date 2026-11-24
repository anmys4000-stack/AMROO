import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../src/lib/auth";

export const runtime = "nodejs";

// توليد تعيينات الإشراف على الفسحة والمناوبة لأيام الدراسة (الأحد إلى الخميس) لعدد من الأسابيع.
// يختار المعلمين الفارغين في الحصة المحددة وغير المستأذنين، مع تفضيل من كان عدد تعييناته أقل.
// لا يعدّل الأيام التي فيها تعيينات موجودة لنفس النوع، فلا يمسح عمل الوكيل اليدوي.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const start = typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate) ? new Date(`${body.startDate}T00:00:00Z`) : null;
  const weeks = Math.min(Math.max(Number(body.weeks ?? 1), 1), 20);
  const breakPeriod = Math.min(Math.max(Number(body.breakPeriod ?? 3), 1), 8);
  const dutyPeriod = Math.min(Math.max(Number(body.dutyPeriod ?? 6), 1), 8);
  const breakCount = Math.min(Math.max(Number(body.breakCount ?? 2), 1), 10);
  const dutyCount = Math.min(Math.max(Number(body.dutyCount ?? 1), 1), 10);
  if (!start || Number.isNaN(start.getTime())) return NextResponse.json({ error: "تاريخ البداية غير صالح" }, { status: 400 });

  const teachers = await prisma.user.findMany({
    where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  const teacherIds = teachers.map((t) => t.id);
  const end = new Date(start.getTime() + weeks * 7 * 86400000);

  const [existing, leaves, lessonsAtBreak, lessonsAtDuty] = await Promise.all([
    prisma.dutyAssignment.findMany({ where: { schoolId: user.schoolId, date: { gte: start, lt: end } }, select: { teacherId: true, date: true, kind: true } }),
    prisma.leaveRequest.findMany({ where: { schoolId: user.schoolId, status: "APPROVED", date: { gte: start, lt: end } }, select: { teacherId: true, date: true } }),
    prisma.timetableEntry.findMany({ where: { schoolId: user.schoolId, period: breakPeriod, teacherId: { not: null } }, select: { teacherId: true, weekday: true } }),
    prisma.timetableEntry.findMany({ where: { schoolId: user.schoolId, period: dutyPeriod, teacherId: { not: null } }, select: { teacherId: true, weekday: true } }),
  ]);
  const totals = new Map<string, number>();
  for (const t of teacherIds) totals.set(t, 0);
  const totalsAll = await prisma.dutyAssignment.groupBy({ by: ["teacherId"], where: { schoolId: user.schoolId }, _count: { _all: true } });
  for (const r of totalsAll) totals.set(r.teacherId, r._count._all);

  const keyOf = (d: Date) => d.toISOString().slice(0, 10);
  const taken = new Set(existing.map((e) => `${e.kind}|${keyOf(e.date)}`));
  const leaveSet = new Set(leaves.map((l) => `${l.teacherId}|${keyOf(l.date)}`));
  const busy = (rows: { teacherId: string | null; weekday: number }[], weekday: number) =>
    new Set(rows.filter((r) => r.weekday === weekday && r.teacherId).map((r) => r.teacherId as string));

  const rows: { teacherId: string; date: Date; kind: string }[] = [];
  let skippedDays = 0;
  for (let w = 0; w < weeks; w++) {
    for (let dow = 0; dow < 5; dow++) {
      const date = new Date(start.getTime() + (w * 7 + dow) * 86400000);
      const weekday = dow + 1;
      const day = keyOf(date);
      for (const [kind, need, rowsForKind] of [
        ["BREAK", breakCount, lessonsAtBreak],
        ["DUTY", dutyCount, lessonsAtDuty],
      ] as const) {
        if (taken.has(`${kind}|${day}`)) {
          skippedDays++;
          continue;
        }
        const blocked = busy(rowsForKind, weekday);
        const pool = teacherIds
          .filter((t) => !blocked.has(t) && !leaveSet.has(`${t}|${day}`))
          .sort((a, b) => (totals.get(a) ?? 0) - (totals.get(b) ?? 0));
        for (const t of pool.slice(0, need)) {
          rows.push({ teacherId: t, date, kind });
          totals.set(t, (totals.get(t) ?? 0) + 1);
        }
      }
    }
  }

  if (rows.length) {
    await prisma.dutyAssignment.createMany({
      data: rows.map((r) => ({ schoolId: user.schoolId, teacherId: r.teacherId, date: r.date, kind: r.kind })),
      skipDuplicates: true,
    });
  }
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "duty_generated", entity: "DutyAssignment", entityId: null },
  });
  return NextResponse.json({ created: rows.length, skippedDays, teachers: teachers.length }, { status: 201 });
}

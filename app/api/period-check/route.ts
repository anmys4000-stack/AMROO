import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// تسجيل أن حصة فصل في يوم محدد قد حُضِّرت. المعلم يسجّل حصصه، والمخوّلون يسجّلون أي حصة.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "attendance:record")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { classId?: unknown; date?: unknown; period?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const classId = typeof body.classId === "string" ? body.classId : "";
  const date = typeof body.date === "string" ? new Date(`${body.date}T00:00:00Z`) : null;
  const period = Number(body.period);
  if (!classId || !date || Number.isNaN(date.getTime()) || !Number.isInteger(period) || period < 1 || period > 8) {
    return NextResponse.json({ error: "بيانات الحصة غير صالحة" }, { status: 400 });
  }

  const cls = await prisma.schoolClass.findUnique({ where: { id: classId } });
  if (!cls || cls.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  const row = await prisma.periodCheck.upsert({
    where: { classId_date_period: { classId, date, period } },
    create: { schoolId: user.schoolId, classId, date, period, recordedBy: user.id },
    update: { recordedBy: user.id },
    select: { id: true },
  });
  return NextResponse.json({ row }, { status: 201 });
}

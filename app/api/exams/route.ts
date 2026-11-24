import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// إضافة حصة اختبار: مادة فصل في يوم وحصة محددة. تُحدَّث إن وُجدت الحصة نفسها.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { classId?: unknown; date?: unknown; period?: unknown; subject?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const classId = typeof body.classId === "string" ? body.classId : "";
  const date = typeof body.date === "string" ? new Date(`${body.date}T00:00:00Z`) : null;
  const period = Number(body.period);
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!classId || !date || Number.isNaN(date.getTime()) || !Number.isInteger(period) || period < 1 || period > 8 || subject.length < 2 || subject.length > 60) {
    return NextResponse.json({ error: "بيانات الاختبار غير صالحة" }, { status: 400 });
  }

  const cls = await prisma.schoolClass.findUnique({ where: { id: classId } });
  if (!cls || cls.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  const slot = await prisma.examSlot.upsert({
    where: { classId_date_period: { classId, date, period } },
    create: { schoolId: user.schoolId, classId, date, period, subject },
    update: { subject },
    select: { id: true },
  });
  return NextResponse.json({ slot }, { status: 201 });
}

// حذف حصة اختبار.
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });

  const slot = await prisma.examSlot.findUnique({ where: { id } });
  if (!slot || slot.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 });
  }
  await prisma.examSlot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

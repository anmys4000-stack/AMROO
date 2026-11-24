import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// تعيين ملاحظ لقاعة في يوم اختبار وحصة محددة. يُستبدل الملاحظ إن وُجد لنفس القاعة.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { date?: unknown; period?: unknown; room?: unknown; teacherId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const date = typeof body.date === "string" ? new Date(`${body.date}T00:00:00Z`) : null;
  const period = Number(body.period);
  const room = typeof body.room === "string" ? body.room.trim() : "";
  const teacherId = typeof body.teacherId === "string" ? body.teacherId : "";
  if (!date || Number.isNaN(date.getTime()) || !Number.isInteger(period) || period < 1 || period > 8 || room.length < 1 || room.length > 40 || !teacherId) {
    return NextResponse.json({ error: "بيانات التعيين غير صالحة" }, { status: 400 });
  }

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.schoolId !== user.schoolId || teacher.role !== "TEACHER") {
    return NextResponse.json({ error: "المعلم غير موجود" }, { status: 404 });
  }

  const row = await prisma.examInvigilation.upsert({
    where: { date_period_room: { date, period, room } },
    create: { schoolId: user.schoolId, date, period, room, teacherId },
    update: { teacherId },
    select: { id: true },
  });
  return NextResponse.json({ row }, { status: 201 });
}

// حذف تعيين ملاحظ.
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

  const row = await prisma.examInvigilation.findUnique({ where: { id } });
  if (!row || row.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "التعيين غير موجود" }, { status: 404 });
  }
  await prisma.examInvigilation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

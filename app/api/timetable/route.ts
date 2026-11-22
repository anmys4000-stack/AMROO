import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// الفصول والمعلمون وحصص فصل محدد، كلها داخل مدرسة المستخدم فقط.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "timetable:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  const classId = new URL(request.url).searchParams.get("classId") ?? "";
  const [classes, teachers, entries] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    classId
      ? prisma.timetableEntry.findMany({
          where: { schoolId: user.schoolId, classId },
          select: { id: true, weekday: true, period: true, subject: true, teacherId: true, teacherName: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ classes, teachers, entries });
}

// إضافة أو تعديل حصة في خانة اليوم والحصة لفصل محدد.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "timetable:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { classId?: unknown; weekday?: unknown; period?: unknown; subject?: unknown; teacherId?: unknown; teacherName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const classId = typeof body.classId === "string" ? body.classId : "";
  const weekday = Number(body.weekday);
  const period = Number(body.period);
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const teacherId = typeof body.teacherId === "string" && body.teacherId ? body.teacherId : null;
  const teacherName =
    !teacherId && typeof body.teacherName === "string" && body.teacherName.trim()
      ? body.teacherName.trim().slice(0, 80)
      : null;

  if (!classId || !Number.isInteger(weekday) || weekday < 1 || weekday > 5) {
    return NextResponse.json({ error: "اليوم غير صالح" }, { status: 400 });
  }
  if (!Number.isInteger(period) || period < 1 || period > 8) {
    return NextResponse.json({ error: "رقم الحصة غير صالح" }, { status: 400 });
  }
  if (subject.length > 60) {
    return NextResponse.json({ error: "اسم المادة طويل" }, { status: 400 });
  }

  const cls = await prisma.schoolClass.findUnique({ where: { id: classId } });
  if (!cls || cls.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الفصل غير موجود" }, { status: 404 });
  }
  if (teacherId) {
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.schoolId !== user.schoolId || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "المعلم غير موجود" }, { status: 400 });
    }
  }

  if (!subject) {
    await prisma.timetableEntry.deleteMany({
      where: { classId, weekday, period, schoolId: user.schoolId },
    });
    return NextResponse.json({ ok: true, removed: true });
  }

  const entry = await prisma.timetableEntry.upsert({
    where: { classId_weekday_period: { classId, weekday, period } },
    create: { schoolId: user.schoolId, classId, weekday, period, subject, teacherId, teacherName },
    update: { subject, teacherId, teacherName },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: entry.id });
}

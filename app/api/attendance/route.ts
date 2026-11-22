import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
type Status = (typeof STATUSES)[number];

// تسجيل حالة حضور طالب ليوم معيّن. يُحدَّث السجل إن وُجد.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "attendance:record")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { studentId?: unknown; date?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const status = typeof body.status === "string" ? (body.status as Status) : null;
  const date = typeof body.date === "string" ? new Date(`${body.date}T00:00:00Z`) : null;
  if (!studentId || !status || !STATUSES.includes(status) || !date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "بيانات الحضور غير صالحة" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  const record = await prisma.attendance.upsert({
    where: { studentId_date: { studentId, date } },
    create: { schoolId: user.schoolId, studentId, date, status, recordedBy: user.id },
    update: { status, recordedBy: user.id },
  });
  return NextResponse.json({ attendance: { id: record.id, status: record.status } });
}

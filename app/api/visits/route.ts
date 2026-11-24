import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// طلب زيارة صفية: يطلبها المعلم لنفسه أو الوكيل لغيره، ويعتمدها من يملك صلاحية الاعتماد.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve") && user.role !== "TEACHER") {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? new Date(`${body.date}T00:00:00Z`) : null;
  const period = Number(body.period);
  const className = typeof body.className === "string" ? body.className.trim() : "";
  const visitorName = typeof body.visitorName === "string" ? body.visitorName.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : null;
  if (!date || !Number.isInteger(period) || period < 1 || period > 8 || className.length < 1 || className.length > 60 || visitorName.length < 2) {
    return NextResponse.json({ error: "بيانات الزيارة غير صالحة" }, { status: 400 });
  }
  // المعلم يطلب لنفسه فقط.
  const teacherId = user.role === "TEACHER" ? user.id : null;
  await prisma.classVisit.create({
    data: { schoolId: user.schoolId, visitorName, teacherId, date, period, className, note, createdBy: user.id },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

// اعتماد الزيارة أو رفضها: للوكيل فقط.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }
  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status === "APPROVED" || body.status === "REJECTED" ? body.status : null;
  if (!id || !status) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  const visit = await prisma.classVisit.findUnique({ where: { id } });
  if (!visit || visit.schoolId !== user.schoolId) return NextResponse.json({ error: "الزيارة غير موجودة" }, { status: 404 });
  await prisma.classVisit.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true });
}

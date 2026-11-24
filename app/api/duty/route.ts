import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

const KINDS = ["BREAK", "DUTY"] as const;
type Kind = (typeof KINDS)[number];

// تعيين معلم للإشراف أو المناوبة في يوم محدد داخل مدرسة المستخدم فقط.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { teacherId?: unknown; date?: unknown; kind?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const teacherId = typeof body.teacherId === "string" ? body.teacherId : "";
  const date = typeof body.date === "string" ? new Date(`${body.date}T00:00:00Z`) : null;
  const kind = (KINDS as readonly string[]).includes(body.kind as string) ? (body.kind as Kind) : null;
  if (!teacherId || !date || Number.isNaN(date.getTime()) || !kind) {
    return NextResponse.json({ error: "بيانات التعيين غير صالحة" }, { status: 400 });
  }

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.schoolId !== user.schoolId || teacher.role !== "TEACHER") {
    return NextResponse.json({ error: "المعلم غير موجود" }, { status: 404 });
  }

  const assignment = await prisma.dutyAssignment.upsert({
    where: { teacherId_date_kind: { teacherId, date, kind } },
    create: { schoolId: user.schoolId, teacherId, date, kind },
    update: {},
    select: { id: true },
  });
  return NextResponse.json({ assignment }, { status: 201 });
}

// حذف تعيين إشراف أو مناوبة لمعلم في يوم محدد.
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

  const row = await prisma.dutyAssignment.findUnique({ where: { id } });
  if (!row || row.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "التعيين غير موجود" }, { status: 404 });
  }
  await prisma.dutyAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

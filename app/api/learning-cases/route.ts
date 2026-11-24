import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

const KINDS = ["LEARNING", "SPEECH"] as const;

// فتح حالة صعوبة تعلم أو نطق لطالب.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "referrals:handle")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { studentId?: unknown; kind?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const kind = (KINDS as readonly string[]).includes(body.kind as string) ? (body.kind as string) : null;
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!studentId || !kind || description.length < 3 || description.length > 500) {
    return NextResponse.json({ error: "بيانات الحالة غير صالحة" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  const row = await prisma.learningCase.create({
    data: { schoolId: user.schoolId, studentId, kind, description },
    select: { id: true },
  });
  return NextResponse.json({ row }, { status: 201 });
}

// إغلاق حالة.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "referrals:handle")) {
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

  const row = await prisma.learningCase.findUnique({ where: { id } });
  if (!row || row.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الحالة غير موجودة" }, { status: 404 });
  }
  await prisma.learningCase.update({ where: { id }, data: { open: false } });
  return NextResponse.json({ ok: true });
}

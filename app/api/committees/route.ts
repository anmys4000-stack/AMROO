import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

const ROLES = ["رئيس", "عضو", "مراقب"];

// إنشاء لجنة اختبار، أو إضافة عضو إليها.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { name?: unknown; committeeId?: unknown; teacherId?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 3 || name.length > 80) {
      return NextResponse.json({ error: "اسم اللجنة غير صالح" }, { status: 400 });
    }
    const committee = await prisma.examCommittee.create({
      data: { schoolId: user.schoolId, name },
      select: { id: true },
    });
    return NextResponse.json({ committee }, { status: 201 });
  }

  const committeeId = typeof body.committeeId === "string" ? body.committeeId : "";
  const teacherId = typeof body.teacherId === "string" ? body.teacherId : "";
  const role = ROLES.includes(body.role as string) ? (body.role as string) : "عضو";
  if (!committeeId || !teacherId) {
    return NextResponse.json({ error: "بيانات العضوية غير صالحة" }, { status: 400 });
  }

  const committee = await prisma.examCommittee.findUnique({ where: { id: committeeId } });
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!committee || committee.schoolId !== user.schoolId || !teacher || teacher.schoolId !== user.schoolId || teacher.role !== "TEACHER") {
    return NextResponse.json({ error: "اللجنة أو المعلم غير موجود" }, { status: 404 });
  }

  const member = await prisma.examCommitteeMember.upsert({
    where: { committeeId_teacherId: { committeeId, teacherId } },
    create: { committeeId, teacherId, role },
    update: { role },
    select: { id: true },
  });
  return NextResponse.json({ member }, { status: 201 });
}

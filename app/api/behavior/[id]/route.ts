import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../src/lib/auth";

export const runtime = "nodejs";

// تعديل وصف سجل سلوكي أو حذفه، داخل مدرسة المستخدم فقط، ويُسجَّل في سجل التدقيق.
async function findOwnRecord(id: string, schoolId: string) {
  return prisma.behaviorRecord.findFirst({ where: { id, schoolId }, select: { id: true, studentId: true } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "behavior:record")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }
  const { id } = await params;
  const record = await findOwnRecord(id, user.schoolId);
  if (!record) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  let body: { description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 3 || description.length > 1000) {
    return NextResponse.json({ error: "الوصف يجب أن يكون بين 3 و1000 حرف" }, { status: 400 });
  }

  const updated = await prisma.behaviorRecord.update({
    where: { id: record.id },
    data: { description },
    select: { id: true, category: true, description: true, createdAt: true },
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "behavior_updated", entity: "Student", entityId: record.studentId },
  });
  return NextResponse.json({ record: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "behavior:record")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }
  const { id } = await params;
  const record = await findOwnRecord(id, user.schoolId);
  if (!record) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  await prisma.behaviorRecord.delete({ where: { id: record.id } });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "behavior_deleted", entity: "Student", entityId: record.studentId },
  });
  return NextResponse.json({ ok: true });
}

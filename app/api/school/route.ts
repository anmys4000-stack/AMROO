import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// تعديل اسم المدرسة. متاح للمدير فقط.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 3 || name.length > 160) {
    return NextResponse.json({ error: "اسم المدرسة غير صالح" }, { status: 400 });
  }
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) || null : null);
  const STAGE_OPTIONS = ["ابتدائي", "متوسط", "ثانوي"];
  const stages = Array.isArray(body.stages) ? body.stages.filter((x): x is string => typeof x === "string" && STAGE_OPTIONS.includes(x)) : [];
  const points = Number(body.compensationPoints ?? 80);
  if (!Number.isInteger(points) || points < 0 || points > 500) {
    return NextResponse.json({ error: "درجات التعويض بين 0 و500" }, { status: 400 });
  }
  // لا تُحدَّث إلا الحقول المرسلة، حتى لا يمسح حفظ الاسم وحده بقية البيانات.
  const data: Record<string, unknown> = { name };
  if ("ministryNumber" in body) data.ministryNumber = text(body.ministryNumber, 20);
  if ("region" in body) data.region = text(body.region, 120);
  if ("city" in body) data.city = text(body.city, 120);
  if ("stages" in body) data.stages = stages;
  if ("schoolType" in body) data.schoolType = text(body.schoolType, 20);
  if ("planType" in body) data.planType = text(body.planType, 20);
  if ("academicYear" in body) data.academicYear = text(body.academicYear, 20);
  if ("currentTerm" in body) data.currentTerm = text(body.currentTerm, 40);
  if ("compensationPoints" in body) data.compensationPoints = points;

  await prisma.school.update({ where: { id: user.schoolId }, data });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "school_updated", entity: "School", entityId: user.schoolId },
  });
  return NextResponse.json({ ok: true });
}

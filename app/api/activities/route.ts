import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

const KINDS = ["CLASS", "NON_CLASS", "BROADCAST", "VISIT"] as const;

// إضافة نشاط مدرسي إلى الخطة. يُضاف غير معتمد حتى يعتمده المدير.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { kind?: unknown; title?: unknown; date?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const kind = (KINDS as readonly string[]).includes(body.kind as string) ? (body.kind as string) : null;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const date = typeof body.date === "string" ? new Date(`${body.date}T00:00:00Z`) : null;
  if (!kind || title.length < 3 || title.length > 120 || !date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "بيانات النشاط غير صالحة" }, { status: 400 });
  }

  const activity = await prisma.activityPlan.create({
    data: { schoolId: user.schoolId, kind, title, date, createdBy: user.id },
    select: { id: true },
  });
  return NextResponse.json({ activity }, { status: 201 });
}

// اعتماد النشاط ليظهر للمعلمين وأولياء الأمور.
export async function PATCH(request: Request) {
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

  const activity = await prisma.activityPlan.findUnique({ where: { id } });
  if (!activity || activity.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "النشاط غير موجود" }, { status: 404 });
  }
  await prisma.activityPlan.update({ where: { id }, data: { approved: true } });
  return NextResponse.json({ ok: true });
}

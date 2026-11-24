import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// نشر تعميم جديد داخل مدرسة المستخدم.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { title?: unknown; body?: unknown; audience?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const audience = body.audience === "TEACHERS" ? "TEACHERS" : "ALL";
  if (title.length < 3 || title.length > 120 || text.length < 3 || text.length > 4000) {
    return NextResponse.json({ error: "بيانات التعميم غير صالحة" }, { status: 400 });
  }

  const circular = await prisma.circular.create({
    data: { schoolId: user.schoolId, title, body: text, audience, createdBy: user.id },
    select: { id: true },
  });
  return NextResponse.json({ circular }, { status: 201 });
}

// تسجيل اطلاع المستخدم الحالي على تعميم.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });

  const circular = await prisma.circular.findUnique({ where: { id } });
  if (!circular || circular.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "التعميم غير موجود" }, { status: 404 });
  }
  if (circular.audience === "TEACHERS" && user.role !== "TEACHER" && !hasPermission(user, "visits:approve")) {
    return NextResponse.json({ error: "هذا التعميم للمعلمين" }, { status: 403 });
  }

  await prisma.circularRead.upsert({
    where: { circularId_userId: { circularId: id, userId: user.id } },
    create: { circularId: id, userId: user.id },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

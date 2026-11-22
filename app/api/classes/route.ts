import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// قائمة فصول مدرسة المستخدم فقط.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "students:view")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }
  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: user.schoolId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ classes });
}

// إضافة فصل إلى مدرسة المستخدم فقط.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "students:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "اسم الفصل غير صالح" }, { status: 400 });
  }

  const existing = await prisma.schoolClass.findFirst({ where: { schoolId: user.schoolId, name } });
  if (existing) {
    return NextResponse.json({ error: "هذا الفصل موجود بالفعل" }, { status: 409 });
  }

  const cls = await prisma.schoolClass.create({
    data: { schoolId: user.schoolId, name },
    select: { id: true, name: true },
  });
  return NextResponse.json({ class: cls }, { status: 201 });
}

// حذف فصل من مدرسة المستخدم. حصص الجدول تُحذف معه، والطلاب يبقون بلا فصل.
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "students:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "معرّف الفصل مطلوب" }, { status: 400 });

  const cls = await prisma.schoolClass.findUnique({ where: { id } });
  if (!cls || cls.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  await prisma.schoolClass.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "class_deleted", entity: "SchoolClass", entityId: id },
  });
  return NextResponse.json({ ok: true });
}

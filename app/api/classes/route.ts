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

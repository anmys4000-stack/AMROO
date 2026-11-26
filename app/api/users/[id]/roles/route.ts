import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../../src/lib/auth";

export const runtime = "nodejs";

const ALLOWED = ["PRINCIPAL", "STUDENT_AFFAIRS", "GUIDANCE", "ACADEMIC_DEPUTY", "TEACHER"] as const;

// المدير يحدد الأدوار الإضافية للمستخدم. الدور الرئيسي لا يُغيَّر هنا، والدور الإضافي لا يكون الدور الرئيسي نفسه.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });

  let body: { extraRoles?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (!Array.isArray(body.extraRoles) || body.extraRoles.some((r) => !(ALLOWED as readonly string[]).includes(r as string))) {
    return NextResponse.json({ error: "الأدوار الإضافية غير صالحة" }, { status: 400 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.schoolId !== user.schoolId) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const extra = Array.from(new Set(body.extraRoles as string[])).filter((r) => r !== target.role);
  await prisma.user.update({ where: { id }, data: { extraRoles: extra as never[] } });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "roles_updated", entity: "User", entityId: id },
  });
  return NextResponse.json({ ok: true });
}

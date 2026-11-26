import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../../src/lib/auth";
import { hashPassword } from "../../../../../src/lib/password";

export const runtime = "nodejs";

// المدير يولّد بيانات الدخول من رقم الهوية: اسم المستخدم هو رقم الهوية، وكلمة المرور المؤقتة هي الرقم نفسه،
// ويُطلب تغييرها عند أول دخول. وهذا لا يتم إلا من المدير داخل مدرسته، ويُسجَّل في سجل التدقيق.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });

  let body: { nationalId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const nationalId = typeof body.nationalId === "string" ? body.nationalId.trim() : "";
  if (!/^\d{10}$/.test(nationalId)) return NextResponse.json({ error: "رقم الهوية يجب أن يكون 10 أرقام" }, { status: 400 });

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.schoolId !== user.schoolId) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const taken = await prisma.user.findFirst({ where: { nationalId, NOT: { id } }, select: { id: true } });
  if (taken) return NextResponse.json({ error: "رقم الهوية مسجّل لمستخدم آخر" }, { status: 409 });

  await prisma.user.update({
    where: { id },
    data: { nationalId, passwordHash: await hashPassword(nationalId), mustChangePassword: true },
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "credentials_reset", entity: "User", entityId: id },
  });
  return NextResponse.json({ ok: true });
}

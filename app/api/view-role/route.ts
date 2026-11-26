import { NextResponse } from "next/server";
import { getCurrentUser, VIEW_COOKIE } from "../../../src/lib/auth";
import type { Role } from "../../../src/lib/permissions";

export const runtime = "nodejs";

// تبديل الدور النشط بين أدوار المستخدم نفسه. لا يمنح صلاحية جديدة: الدور يجب أن يكون ضمن أدواره.
// دور فارغ يعيد الدور الرئيسي.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const role = typeof body.role === "string" ? body.role : "";

  const res = NextResponse.json({ ok: true });
  if (!role) {
    res.cookies.delete(VIEW_COOKIE);
    return res;
  }
  if (!user.allRoles.includes(role as Role)) {
    return NextResponse.json({ error: "هذا الدور ليس من أدوارك" }, { status: 403 });
  }
  res.cookies.set(VIEW_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
